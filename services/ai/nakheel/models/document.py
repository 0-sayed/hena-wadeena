from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


class DocumentMetadata(BaseModel):
    doc_id: str
    filename: str
    source_type: str = "pdf"
    title: str | None = None
    language: str = "mixed"
    total_pages: int = 0
    total_chunks: int = 0
    file_size_kb: float = 0
    uploaded_at: datetime
    indexed_at: datetime | None = None
    status: DocumentStatus = DocumentStatus.PENDING
    qdrant_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    description: str | None = None
    current_step: str | None = None
