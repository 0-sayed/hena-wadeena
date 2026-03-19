from datetime import UTC, datetime

import pytest

from nakheel.config import Settings
from nakheel.core.session.context_window import trim_history
from nakheel.core.session.session_manager import SessionManager


class _FakeSessionsCollection:
    def __init__(self, record):
        self.record = record
        self.updated = None

    async def find_one(self, filters):
        if self.record and filters["session_id"] == self.record["session_id"]:
            return dict(self.record)
        return None

    async def update_one(self, filters, update):
        self.updated = (filters, update)


class _FakeMongo:
    def __init__(self, record):
        self.sessions = _FakeSessionsCollection(record)

    def collection(self, name):
        assert name == "sessions"
        return self.sessions


def test_trim_history_keeps_latest_messages():
    messages = [{"role": "user", "content": f"message {index}"} for index in range(20)]
    trimmed = trim_history(messages, max_messages=10, token_budget=1000)
    assert len(trimmed) == 10
    assert trimmed[0]["content"] == "message 10"


def test_trim_history_respects_token_budget():
    messages = [{"role": "user", "content": "word " * 100}] * 5
    trimmed = trim_history(messages, max_messages=10, token_budget=50)
    assert trimmed == []


@pytest.mark.asyncio
async def test_get_session_handles_legacy_naive_datetimes():
    record = {
        "session_id": "sess-1",
        "user_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "language": "en",
        "message_count": 0,
        "is_active": True,
        "metadata": {},
    }
    manager = SessionManager(_FakeMongo(record), Settings(SESSION_TTL_HOURS=24))

    session = await manager.get_session("sess-1")

    assert session.created_at.tzinfo is not None
    assert session.updated_at.tzinfo is not None
    assert session.updated_at.utcoffset() == UTC.utcoffset(session.updated_at)
