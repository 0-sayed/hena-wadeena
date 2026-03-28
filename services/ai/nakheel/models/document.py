from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    """Lifecycle states for an indexed knowledge source."""

    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


class DocumentBatchStatus(str, Enum):
    """Lifecycle states for an ingestion batch."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    COMPLETED_WITH_ERRORS = "completed_with_errors"
    FAILED = "failed"


class DocumentSourceType(str, Enum):
    """Supported document ingestion origins."""

    PDF = "pdf"
    COPIED_DOC = "copied_doc"


class DocumentMetadata(BaseModel):
    """Stored metadata for a source document in MongoDB."""

    doc_id: str
    batch_id: str | None = None
    filename: str
    source_type: DocumentSourceType = DocumentSourceType.PDF
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
    error_detail: str | None = None


class DocumentBatchItem(BaseModel):
    """Per-document status tracking inside a batch."""

    doc_id: str
    filename: str
    status: DocumentStatus = DocumentStatus.PENDING
    current_step: str | None = None
    error_detail: str | None = None
    total_pages: int = 0
    total_chunks: int = 0
    language: str | None = None
    indexed_at: datetime | None = None


class DocumentBatchMetadata(BaseModel):
    """Stored metadata for a batch document ingestion job."""

    batch_id: str
    status: DocumentBatchStatus = DocumentBatchStatus.PENDING
    title: str | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    language_hint: str = "auto"
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    items: list[DocumentBatchItem] = Field(default_factory=list)
