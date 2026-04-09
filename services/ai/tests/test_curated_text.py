from __future__ import annotations

import pytest

from nakheel.core.ingestion.curated_text import (
    MAX_ENTRY_CONTENT_CHARS,
    _load_llm_payload,
    compose_curated_documents,
    normalize_curated_entries,
)


class UnavailableLLM:
    def is_available(self):
        return False


def test_normalize_curated_entries_deduplicates_slugs_and_skips_empty_content():
    entries = normalize_curated_entries(
        [
            {"slug": " geography ", "title": "Geography", "content": "About geography."},
            {"slug": "geography", "title": "Geography 2", "content": "About districts."},
            {"slug": "empty", "title": "Empty", "content": "   "},
        ]
    )

    assert [entry.slug for entry in entries] == ["geography", "geography-2"]
    assert len(entries) == 2


@pytest.mark.asyncio
async def test_compose_curated_documents_uses_heading_fallback_when_llm_unavailable():
    strategy, entries = await compose_curated_documents(
        "Overview of New Valley.\n\nGeography and administration\n\nThe governorate spans a wide desert area.\n\nTourism and heritage\n\nThe region includes major archaeological sites.",
        llm_client=UnavailableLLM(),
        default_language="ar",
    )

    assert strategy == "fallback"
    assert len(entries) == 3
    assert entries[1].slug == "geography-and-administration"
    assert "wide desert area" in entries[1].content


def test_load_llm_payload_preserves_json_substrings_without_language_tag():
    entries = _load_llm_payload(
        '```\n[{"slug":"json-overview","title":"JSON Overview","content":"json content"}]\n```'
    )

    assert entries[0]["slug"] == "json-overview"
    assert entries[0]["content"] == "json content"


def test_normalize_curated_entries_splits_oversized_content():
    oversized_content = " ".join(["new-valley"] * (MAX_ENTRY_CONTENT_CHARS // 5))
    entries = normalize_curated_entries(
        [
            {
                "slug": "strategic-report",
                "title": "Strategic report",
                "content": oversized_content,
                "language": "en",
            }
        ]
    )

    assert len(entries) >= 2
    assert all(len(entry.content) <= MAX_ENTRY_CONTENT_CHARS for entry in entries)
    assert entries[0].slug == "strategic-report-part-1"
