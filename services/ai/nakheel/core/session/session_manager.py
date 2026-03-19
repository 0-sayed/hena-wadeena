from __future__ import annotations

from datetime import UTC, datetime, timedelta

from nakheel.config import Settings
from nakheel.db.mongo import MongoDatabase
from nakheel.exceptions import SessionExpiredError, SessionNotFoundError
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

    async def create_session(self, user_id: str | None, language_preference: str, metadata: dict) -> Session:
        """Create a new active session."""

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

    async def get_session(self, session_id: str) -> Session:
        """Load an active session or raise if it is missing or expired."""

        record = await self.mongo.collection("sessions").find_one({"session_id": session_id})
        if not record:
            raise SessionNotFoundError(f"No session with id: {session_id}")
        session = Session.model_validate(record)
        session.created_at = self._ensure_utc(session.created_at)
        session.updated_at = self._ensure_utc(session.updated_at)
        expired_at = datetime.now(UTC) - timedelta(hours=self.settings.SESSION_TTL_HOURS)
        if session.updated_at < expired_at or not session.is_active:
            await self.mongo.collection("sessions").update_one(
                {"session_id": session_id},
                {"$set": {"is_active": False}},
            )
            raise SessionExpiredError(f"Session expired: {session_id}")
        return session

    async def close_session(self, session_id: str) -> Session:
        """Soft-close an active session while keeping its audit trail."""

        session = await self.get_session(session_id)
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

    async def build_context_window(self, session_id: str, current_user_message: str) -> list[dict[str, str]]:
        """Build the bounded conversation history sent to the LLM."""

        cursor = self.mongo.collection("messages").find({"session_id": session_id}).sort("created_at", 1)
        history_records = await cursor.to_list(length=self.settings.SESSION_MAX_MESSAGES * 4)
        history = [{"role": item["role"], "content": item["content"]} for item in history_records]
        trimmed = trim_history(history, self.settings.SESSION_MAX_MESSAGES, self.settings.TOKEN_BUDGET_HISTORY)
        trimmed.append({"role": "user", "content": current_user_message})
        return trimmed

    def welcome_message(self, language_preference: str) -> str:
        """Return the localized greeting shown for a new session."""

        if language_preference == "ar-eg":
            return "أهلاً! أنا نخيل، مساعدك في منصة هنا وادينا. اسألني أي شيء عن الوادي الجديد."
        if language_preference.startswith("ar"):
            return "أهلاً بك! أنا نخيل، مساعد منصة هنا وادينا للأسئلة المتعلقة بالوادي الجديد."
        return "Hello! I'm Nakheel, your assistant for questions about New Valley Governorate."

    def detect_or_prefer_language(self, preferred: str, text: str) -> str:
        """Honor an explicit language preference or detect one from the input."""

        if preferred != "auto":
            return preferred
        return detect_language(text).code

    @staticmethod
    def _ensure_utc(value: datetime) -> datetime:
        """Normalize naive datetimes from legacy Mongo decoding into UTC-aware values."""

        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
