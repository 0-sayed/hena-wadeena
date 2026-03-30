from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class Chunk(BaseModel):
    chunk_id: str
    doc_id: str
    chunk_index: int
    section_title: str | None = None
    parent_section: str | None = None
    text: str
    text_ar: str | None = None
    language: str
    page_numbers: list[int] = Field(default_factory=list)
    token_count: int
    char_count: int
    overlap_prev: str | None = None
    overlap_next: str | None = None
    created_at: datetime

