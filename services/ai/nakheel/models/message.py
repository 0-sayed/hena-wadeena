from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class RetrievedChunkRef(BaseModel):
    chunk_id: str
    doc_id: str
    section_title: str | None = None
    score: float
    text_snippet: str


class Message(BaseModel):
    message_id: str
    session_id: str
    role: MessageRole
    content: str
    language: str
    created_at: datetime
    retrieved_chunks: list[RetrievedChunkRef] = Field(default_factory=list)
    domain_relevant: bool | None = None
    llm_model: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    latency_ms: int | None = None

