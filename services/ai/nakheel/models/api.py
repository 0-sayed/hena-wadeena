from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    user_id: str | None = None
    language_preference: str = "auto"
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreateSessionResponse(BaseModel):
    session_id: str
    user_id: str | None = None
    created_at: datetime
    language_preference: str
    message_count: int
    is_active: bool
    welcome_message: str


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    language: str = "auto"


class SourceResponse(BaseModel):
    chunk_id: str
    doc_id: str
    section_title: str | None = None
    relevance_score: float
    text_snippet: str


class SendMessageResponse(BaseModel):
    message_id: str
    session_id: str
    role: str
    content: str
    language: str
    created_at: datetime
    sources: list[SourceResponse] = Field(default_factory=list)
    domain_relevant: bool
    latency_ms: int | None = None


class SessionMessageView(BaseModel):
    message_id: str
    role: str
    content: str
    language: str
    created_at: datetime
    sources: list[SourceResponse] = Field(default_factory=list)


class SessionViewResponse(BaseModel):
    session_id: str
    user_id: str | None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    message_count: int
    messages: list[SessionMessageView]
    pagination: dict[str, int]


class DeleteSessionResponse(BaseModel):
    session_id: str
    closed: bool
    message_count: int
    closed_at: datetime


class DocumentInjectResponse(BaseModel):
    doc_id: str
    status: str
    filename: str
    total_pages: int
    total_chunks: int
    language: str
    indexed_at: datetime | None = None
    qdrant_point_count: int
    processing_time_ms: int


class DocumentBatchItemResponse(BaseModel):
    doc_id: str
    filename: str
    status: str
    current_step: str | None = None
    error_detail: str | None = None
    total_pages: int = 0
    total_chunks: int = 0
    language: str | None = None
    indexed_at: datetime | None = None


class DocumentBatchResponse(BaseModel):
    batch_id: str
    status: str
    total_files: int
    pending_files: int
    processing_files: int
    indexed_files: int
    failed_files: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    items: list[DocumentBatchItemResponse] = Field(default_factory=list)


class DocumentListItemResponse(BaseModel):
    doc_id: str
    batch_id: str | None = None
    filename: str
    source_type: str
    title: str | None = None
    language: str = "mixed"
    total_pages: int = 0
    total_chunks: int = 0
    file_size_kb: float = 0
    uploaded_at: datetime
    indexed_at: datetime | None = None
    status: str
    tags: list[str] = Field(default_factory=list)
    description: str | None = None
    current_step: str | None = None
    error_detail: str | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItemResponse] = Field(default_factory=list)
    pagination: dict[str, int]


class ParsedMarkdownResponse(BaseModel):
    parse_id: str
    filename: str
    markdown_filename: str
    format: str
    total_pages: int
    word_count: int
    language_detected: str
    processing_time_ms: int
    expires_at: datetime
    download_url: str


class RawTextInjectRequest(BaseModel):
    content: str = Field(min_length=1, max_length=200000)
    title: str | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    language: str = "auto"
