from __future__ import annotations

from datetime import UTC, datetime, timedelta

from nakheel.config import Settings
from nakheel.db.mongo import MongoDatabase
from nakheel.exceptions import SessionExpiredError, SessionForbiddenError, SessionNotFoundError
from nakheel.models.message import Message, MessageRole, RetrievedChunkRef
from nakheel.models.session import Session
from nakheel.utils.ids import new_id
from nakheel.utils.language import detect_language

from .context_window import trim_history


class SessionManager:
    """Encapsulates session lifecycle, persistence, and chat history access."""

    def __init__(self, mongo: MongoDatabase, settings: Settings) -> None:
        self.mongo = mongo
        self.settings = settings

    async def create_session(self, user_id: str, language_preference: str, metadata: dict) -> Session:
        """Create a new active session for an authenticated user."""

        now = datetime.now(UTC)
        session = Session(
            session_id=new_id("sess"),
            user_id=user_id,
            created_at=now,
            updated_at=now,
            language=None if language_preference == "auto" else language_preference,
            message_count=0,
            is_active=True,
            metadata=metadata,
        )
        await self.mongo.collection("sessions").insert_one(session.model_dump(mode="json"))
        return session

    async def get_or_create_active_session(
        self,
        user_id: str,
        language_preference: str,
        metadata: dict,
        force_new: bool,
    ) -> Session:
        """Return the latest active session for a user, or create a new one."""

        existing = await self._find_latest_active_session(user_id)
        if existing is not None and self._is_expired(existing):
            await self._mark_session_closed(existing.session_id)
            existing = None

        if existing is not None and not force_new:
            return existing

        if existing is not None and force_new:
            await self._mark_session_closed(existing.session_id)

        return await self.create_session(
            user_id=user_id,
            language_preference=language_preference,
            metadata=metadata,
        )

    async def get_session(self, session_id: str, user_id: str) -> Session:
        """Load an active session for a specific user and enforce ownership."""

        record = await self.mongo.collection("sessions").find_one({"session_id": session_id})
        if not record:
            raise SessionNotFoundError(f"No session with id: {session_id}")

        session = Session.model_validate(record)
        session.created_at = self._ensure_utc(session.created_at)
        session.updated_at = self._ensure_utc(session.updated_at)

        if session.user_id != user_id:
            raise SessionForbiddenError("You do not have access to this session")

        if self._is_expired(session) or not session.is_active:
            await self._mark_session_closed(session_id)
            raise SessionExpiredError(f"Session expired: {session_id}")

        return session

    async def close_session(self, session_id: str, user_id: str) -> Session:
        """Soft-close an active session while keeping its audit trail."""

        session = await self.get_session(session_id, user_id)
        now = datetime.now(UTC)
        await self.mongo.collection("sessions").update_one(
            {"session_id": session_id},
            {"$set": {"is_active": False, "updated_at": now}},
        )
        session.is_active = False
        session.updated_at = now
        return session

    async def save_message(
        self,
        session_id: str,
        role: MessageRole,
        content: str,
        language: str,
        retrieved_chunks: list[RetrievedChunkRef] | None = None,
        domain_relevant: bool | None = None,
        llm_model: str | None = None,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        latency_ms: int | None = None,
    ) -> Message:
        """Persist a chat message and keep session counters in sync."""

        message = Message(
            message_id=new_id("msg"),
            session_id=session_id,
            role=role,
            content=content,
            language=language,
            created_at=datetime.now(UTC),
            retrieved_chunks=retrieved_chunks or [],
            domain_relevant=domain_relevant,
            llm_model=llm_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
        )
        await self.mongo.collection("messages").insert_one(message.model_dump(mode="json"))
        await self.mongo.collection("sessions").update_one(
            {"session_id": session_id},
            {
                "$set": {"updated_at": message.created_at, "language": language},
                "$inc": {"message_count": 1},
            },
        )
        return message

    async def get_messages(self, session_id: str, page: int = 1, per_page: int = 20) -> tuple[list[Message], int]:
        """Return paginated session history in chronological order."""

        cursor = self.mongo.collection("messages").find({"session_id": session_id}).sort("created_at", 1)
        total = await self.mongo.collection("messages").count_documents({"session_id": session_id})
        records = await cursor.skip((page - 1) * per_page).limit(per_page).to_list(length=per_page)
        return [Message.model_validate(item) for item in records], total

    async def build_context_window(
        self,
        session_id: str,
        current_user_message: str,
        exclude_message_id: str | None = None,
    ) -> list[dict[str, str]]:
        """Build the bounded conversation history sent to the LLM."""

        cursor = self.mongo.collection("messages").find({"session_id": session_id}).sort("created_at", 1)
        history_records = await cursor.to_list(length=self.settings.SESSION_MAX_MESSAGES * 4)
        if exclude_message_id is not None:
            history_records = [
                item for item in history_records if item.get("message_id") != exclude_message_id
            ]
        history = [{"role": item["role"], "content": item["content"]} for item in history_records]
        trimmed = trim_history(history, self.settings.SESSION_MAX_MESSAGES, self.settings.TOKEN_BUDGET_HISTORY)
        trimmed.append({"role": "user", "content": current_user_message})
        return trimmed

    def welcome_message(self, language_preference: str) -> str:
        """Return a greeting shown when a new session is created."""

        if language_preference.startswith("ar"):
            return "\u0623\u0647\u0644\u0627\u064b! \u0623\u0646\u0627 \u0646\u062e\u064a\u0644\u060c \u0645\u0633\u0627\u0639\u062f\u0643 \u0641\u064a \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0648\u0627\u062f\u064a \u0627\u0644\u062c\u062f\u064a\u062f."
        return "Hello! I am Nakheel, your assistant for New Valley questions."

    def detect_or_prefer_language(self, preferred: str, text: str) -> str:
        """Honor an explicit language preference or detect one from the input."""

        if preferred != "auto":
            return preferred
        return detect_language(text).code

    async def _find_latest_active_session(self, user_id: str) -> Session | None:
        record = await self.mongo.collection("sessions").find_one(
            {"user_id": user_id, "is_active": True},
            sort=[("updated_at", -1)],
        )
        if not record:
            return None
        session = Session.model_validate(record)
        session.created_at = self._ensure_utc(session.created_at)
        session.updated_at = self._ensure_utc(session.updated_at)
        return session

    async def _mark_session_closed(self, session_id: str) -> None:
        await self.mongo.collection("sessions").update_one(
            {"session_id": session_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(UTC)}},
        )

    def _is_expired(self, session: Session) -> bool:
        expired_at = datetime.now(UTC) - timedelta(hours=self.settings.SESSION_TTL_HOURS)
        return session.updated_at < expired_at

    @staticmethod
    def _ensure_utc(value: datetime) -> datetime:
        """Normalize naive datetimes from legacy Mongo decoding into UTC-aware values."""

        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
