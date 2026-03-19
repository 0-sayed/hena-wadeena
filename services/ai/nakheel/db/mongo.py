from __future__ import annotations

from datetime import UTC
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from nakheel.config import Settings


class MongoDatabase:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: AsyncIOMotorClient | None = None
        self.db: AsyncIOMotorDatabase | None = None

    async def connect(self) -> None:
        self.client = AsyncIOMotorClient(
            self.settings.MONGODB_URI,
            tz_aware=True,
            tzinfo=UTC,
        )
        self.db = self.client[self.settings.MONGODB_DB_NAME]

    async def close(self) -> None:
        if self.client is not None:
            self.client.close()

    async def ensure_indexes(self) -> None:
        assert self.db is not None
        await self.db.documents.create_index("doc_id", unique=True)
        await self.db.documents.create_index("batch_id")
        await self.db.documents.create_index("status")
        await self.db.documents.create_index("uploaded_at")
        await self.db.document_batches.create_index("batch_id", unique=True)
        await self.db.document_batches.create_index("status")
        await self.db.document_batches.create_index("created_at")
        await self.db.chunks.create_index("chunk_id", unique=True)
        await self.db.chunks.create_index("doc_id")
        await self.db.chunks.create_index("language")
        await self.db.sessions.create_index("session_id", unique=True)
        await self.db.sessions.create_index("user_id")
        await self.db.messages.create_index([("session_id", 1), ("created_at", 1)])
        await self.db.messages.create_index("message_id", unique=True)
        await self.db.audit_logs.create_index("created_at")

    async def ping(self) -> bool:
        try:
            assert self.db is not None
            await self.db.command("ping")
            return True
        except Exception:
            return False

    def collection(self, name: str):
        assert self.db is not None
        return self.db[name]

    async def insert_one(self, name: str, payload: dict[str, Any]) -> None:
        await self.collection(name).insert_one(payload)
