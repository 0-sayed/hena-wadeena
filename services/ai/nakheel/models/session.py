from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Session(BaseModel):
    session_id: str
    user_id: str | None = None
    created_at: datetime
    updated_at: datetime
    language: str | None = None
    message_count: int = 0
    is_active: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)

