from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from loguru import logger

from nakheel.config import Settings
from nakheel.core.ingestion.indexer import DocumentIndexer


@dataclass(frozen=True, slots=True)
class BootstrapKnowledgeDocument:
    slug: str
    title: str
    description: str
    content: str
    tags: list[str]
    language: str = "ar"


def load_bootstrap_documents(path: Path) -> list[BootstrapKnowledgeDocument]:
    """Read the curated startup dataset from disk."""

    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("Bootstrap knowledge base file must contain a JSON array")
    documents: list[BootstrapKnowledgeDocument] = []
    for raw_item in payload:
        if not isinstance(raw_item, dict):
            raise ValueError("Bootstrap knowledge base entries must be JSON objects")
        documents.append(
            BootstrapKnowledgeDocument(
                slug=str(raw_item["slug"]).strip(),
                title=str(raw_item["title"]).strip(),
                description=str(raw_item.get("description", "")).strip(),
                content=str(raw_item["content"]).strip(),
                tags=[str(tag).strip() for tag in raw_item.get("tags", []) if str(tag).strip()],
                language=str(raw_item.get("language", "ar")).strip() or "ar",
            )
        )
    return documents


async def bootstrap_knowledge_base(settings: Settings, indexer: DocumentIndexer) -> dict[str, Any]:
    """Seed curated RAG documents in the background when startup bootstrap is enabled."""

    if not settings.BOOTSTRAP_KNOWLEDGE_BASE_ON_STARTUP:
        return {"enabled": False, "indexed": 0, "skipped": 0, "failed": 0}

    path = settings.BOOTSTRAP_KNOWLEDGE_BASE_FILE
    if not path.exists():
        logger.warning("Bootstrap knowledge base file not found: {}", path)
        return {"enabled": True, "loaded": 0, "indexed": 0, "skipped": 0, "failed": 0}

    documents = load_bootstrap_documents(path)
    indexed = 0
    skipped = 0
    failed = 0

    for document in documents:
        try:
            result = await indexer.inject_bootstrap_text(
                slug=document.slug,
                content=document.content,
                title=document.title,
                description=document.description,
                tags=document.tags,
                language_hint=document.language,
            )
            if result.get("skipped"):
                skipped += 1
            else:
                indexed += 1
        except Exception as exc:
            failed += 1
            logger.opt(exception=exc).error("Bootstrap ingestion failed for slug {}", document.slug)

    summary = {
        "enabled": True,
        "loaded": len(documents),
        "indexed": indexed,
        "skipped": skipped,
        "failed": failed,
    }
    logger.info("Bootstrap knowledge base summary: {}", summary)
    return summary
