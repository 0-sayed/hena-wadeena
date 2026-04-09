from __future__ import annotations

import json
from pathlib import Path

import pytest

from nakheel.bootstrap.knowledge_base import bootstrap_knowledge_base, load_bootstrap_documents
from nakheel.config import Settings


def test_load_bootstrap_documents_reads_json_array(tmp_path: Path):
    file_path = tmp_path / "seed.json"
    file_path.write_text(
        json.dumps(
            [
                {
                    "slug": "doc-one",
                    "title": "عنوان",
                    "description": "وصف",
                    "content": "محتوى",
                    "tags": ["تجربة"],
                    "language": "ar",
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    documents = load_bootstrap_documents(file_path)

    assert len(documents) == 1
    assert documents[0].slug == "doc-one"
    assert documents[0].title == "عنوان"


def test_load_bootstrap_documents_skips_malformed_entries(tmp_path: Path):
    file_path = tmp_path / "seed.json"
    file_path.write_text(
        json.dumps(
            [
                "not-an-object",
                {"slug": "missing-title", "content": "content"},
                {"slug": "valid-doc", "title": "Title", "content": "Content", "tags": "bad-tags"},
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    documents = load_bootstrap_documents(file_path)

    assert len(documents) == 1
    assert documents[0].slug == "valid-doc"
    assert documents[0].tags == []


@pytest.mark.asyncio
async def test_bootstrap_knowledge_base_counts_indexed_and_skipped(tmp_path: Path):
    file_path = tmp_path / "seed.json"
    file_path.write_text(
        json.dumps(
            [
                {
                    "slug": "doc-indexed",
                    "title": "Doc 1",
                    "description": "Desc 1",
                    "content": "Content 1",
                    "tags": ["one"],
                    "language": "ar",
                },
                {
                    "slug": "doc-skipped",
                    "title": "Doc 2",
                    "description": "Desc 2",
                    "content": "Content 2",
                    "tags": ["two"],
                    "language": "ar",
                },
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    class FakeIndexer:
        async def inject_bootstrap_text(self, *, slug, **_kwargs):
            return {"skipped": slug == "doc-skipped"}

    summary = await bootstrap_knowledge_base(
        Settings(
            BOOTSTRAP_KNOWLEDGE_BASE_ON_STARTUP=True,
            BOOTSTRAP_KNOWLEDGE_BASE_FILE=file_path,
        ),
        FakeIndexer(),
    )

    assert summary == {
        "enabled": True,
        "loaded": 2,
        "indexed": 1,
        "skipped": 1,
        "failed": 0,
    }
