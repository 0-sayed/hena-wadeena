from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from loguru import logger

from nakheel.api.deps import (
    AuthenticatedUser,
    get_admin_user,
    get_indexer,
    get_llm_client,
    get_mongo,
    get_qdrant,
)
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.ingestion.curated_text import compose_curated_documents, normalize_curated_entries
from nakheel.core.ingestion.indexer import DocumentIndexer, QueuedPdf
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase
from nakheel.exceptions import BadRequestError, DocumentNotFoundError
from nakheel.models.api import (
    CuratedKnowledgeComposeRequest,
    CuratedKnowledgeComposeResponse,
    CuratedKnowledgeFeedRequest,
    CuratedKnowledgeFeedResponse,
    DocumentBatchResponse,
    DocumentListResponse,
    ParsedMarkdownResponse,
    RawTextInjectRequest,
)

router = APIRouter(prefix="/documents")
CURATED_FEED_CONCURRENCY = 4


@router.post("/curated/compose", response_model=CuratedKnowledgeComposeResponse)
async def compose_curated_text(
    payload: CuratedKnowledgeComposeRequest,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    llm_client: LLMClient = Depends(get_llm_client),
):
    """Convert a long report into topic-separated curated entries for review before ingestion."""

    strategy, entries = await compose_curated_documents(
        payload.text,
        llm_client=llm_client,
        default_language=payload.language,
    )
    return {"strategy": strategy, "entries": [entry.to_dict() for entry in entries]}


@router.post("/curated/feed", response_model=CuratedKnowledgeFeedResponse)
async def feed_curated_text(
    payload: CuratedKnowledgeFeedRequest,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    """Index curated text entries after the admin reviews and optionally edits their slugs."""

    entries = normalize_curated_entries(
        [entry.model_dump(mode="json") for entry in payload.entries],
        default_language="ar",
    )
    if not entries:
        raise BadRequestError("At least one valid curated entry is required")

    semaphore = asyncio.Semaphore(min(CURATED_FEED_CONCURRENCY, len(entries)))

    async def process_entry(entry) -> dict:
        async with semaphore:
            try:
                result = await indexer.inject_curated_text(
                    slug=entry.slug,
                    content=entry.content,
                    title=entry.title,
                    description=entry.description,
                    tags=entry.tags,
                    language_hint=entry.language,
                )
                return {
                    "slug": result.get("slug", entry.slug),
                    "title": entry.title,
                    "status": result["status"],
                    "filename": result["filename"],
                    "doc_id": result["doc_id"],
                    "indexed_at": result.get("indexed_at"),
                    "total_chunks": result.get("total_chunks", 0),
                    "error_detail": None,
                }
            except Exception as exc:
                logger.exception("Curated text indexing failed for slug {}", entry.slug)
                return {
                    "slug": entry.slug,
                    "title": entry.title,
                    "status": "failed",
                    "filename": f"{entry.slug}.md",
                    "doc_id": None,
                    "indexed_at": None,
                    "total_chunks": 0,
                    "error_detail": str(getattr(exc, "detail", exc)),
                }

    items = await asyncio.gather(*(process_entry(entry) for entry in entries))
    indexed_entries = sum(item["status"] == "indexed" for item in items)

    return {
        "total_entries": len(entries),
        "indexed_entries": indexed_entries,
        "failed_entries": len(entries) - indexed_entries,
        "items": items,
    }


@router.post(
    "/inject",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=DocumentBatchResponse,
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["files"],
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "format": "binary",
                                },
                                "description": "Upload one or more PDF files",
                            },
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "tags": {"type": "string"},
                            "language": {"type": "string", "default": "auto"},
                        },
                    }
                }
            },
            "required": True,
        }
    },
)
async def inject_documents(
    request: Request,
    files: Annotated[List[UploadFile], File(...)],
    title: Optional[str] = Form(default=None),
    description: Optional[str] = Form(default=None),
    tags: Optional[str] = Form(default=None),
    language: str = Form(default="auto"),
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    """Create an asynchronous PDF ingestion batch and return immediately."""

    queued_files: list[QueuedPdf] = []
    for uploaded in files:
        queued_files.append(
            QueuedPdf(filename=uploaded.filename or "document.pdf", file_bytes=await uploaded.read())
        )
    parsed_tags = [tag.strip() for tag in tags.split(",")] if tags else []
    batch = await indexer.create_document_batch(
        files=queued_files,
        title=title,
        description=description,
        tags=parsed_tags,
        language_hint=language,
    )

    if batch["pending_files"] > 0:
        batch_tasks = getattr(request.app.state, "background_tasks", None)
        if batch_tasks is None:
            batch_tasks = set()
            request.app.state.background_tasks = batch_tasks

        task = asyncio.create_task(indexer.process_document_batch(batch["batch_id"]))
        batch_tasks.add(task)

        def _on_task_done(done_task: asyncio.Task) -> None:
            batch_tasks.discard(done_task)
            if done_task.cancelled():
                return
            task_exception = done_task.exception()
            if task_exception is not None:
                logger.opt(exception=task_exception).error(
                    "Document batch processing failed for batch {}",
                    batch["batch_id"],
                )

        task.add_done_callback(_on_task_done)
    return batch


@router.post("/parse", response_model=ParsedMarkdownResponse)
async def parse_document(
    request: Request,
    file: UploadFile = File(...),
    format: str = Form(default="markdown"),
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    """Parse a PDF into a temporary Markdown artifact and return a direct download link."""

    if format != "markdown":
        raise BadRequestError("Only markdown format is supported in the MVP")
    file_bytes = await file.read()
    parsed = await indexer.parse_only(filename=file.filename or "document.pdf", file_bytes=file_bytes)
    return {
        **parsed,
        "download_url": str(request.url_for("download_parsed_markdown", parse_id=parsed["parse_id"])),
    }


@router.get("/parsed/{parse_id}/download")
async def download_parsed_markdown(
    parse_id: str,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    """Download a staged Markdown parse result before it expires."""

    parsed = indexer.resolve_parsed_markdown(parse_id)
    return FileResponse(
        path=parsed["path"],
        filename=parsed["markdown_filename"],
        media_type="text/markdown",
    )


@router.post("/inject-text")
async def inject_raw_text(
    payload: RawTextInjectRequest,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    """Index pasted text as a copied document source."""

    return await indexer.inject_raw_text(
        content=payload.content,
        title=payload.title,
        description=payload.description,
        tags=payload.tags,
        language_hint=payload.language,
    )


@router.get("/batches/{batch_id}", response_model=DocumentBatchResponse)
async def get_document_batch_status(
    batch_id: str,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    """Return the latest persisted ingestion state for a submitted PDF batch."""

    return await indexer.get_document_batch_status(batch_id)


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    mongo: MongoDatabase = Depends(get_mongo),
    qdrant: QdrantDatabase = Depends(get_qdrant),
):
    """Delete a document and its associated vectors, chunks, and audit summary."""

    document = await mongo.collection("documents").find_one({"doc_id": doc_id}, {"_id": 0})
    if not document:
        raise DocumentNotFoundError(f"No document with id: {doc_id}")
    if document.get("status") == "processing":
        raise BadRequestError("Cannot delete document while it is being processed")
    qdrant_ids = document.get("qdrant_ids", [])
    deleted_at = datetime.now(UTC)
    qdrant_deleted = False
    try:
        if qdrant_ids:
            await qdrant.delete_points_async(qdrant_ids)
            qdrant_deleted = True
        chunks_deleted = await mongo.collection("chunks").delete_many({"doc_id": doc_id})
        document_deleted = await mongo.collection("documents").delete_one({"doc_id": doc_id})
        await mongo.collection("audit_logs").insert_one(
            {
                "event": "document_deleted",
                "doc_id": doc_id,
                "created_at": deleted_at,
                "partial_failure": False,
            }
        )
    except Exception as exc:
        logger.exception("Partial delete failure for document {}", doc_id)
        try:
            await mongo.collection("audit_logs").insert_one(
                {
                    "event": "document_delete_failed",
                    "doc_id": doc_id,
                    "created_at": deleted_at,
                    "partial_failure": True,
                    "qdrant_ids": qdrant_ids,
                    "qdrant_deleted": qdrant_deleted,
                    "error": str(exc),
                }
            )
        except Exception as audit_exc:
            logger.opt(exception=audit_exc).warning(
                "Failed to persist delete-failure audit log for document {}",
                doc_id,
            )
        raise
    return {
        "doc_id": doc_id,
        "deleted": True,
        "qdrant_points_deleted": len(qdrant_ids),
        "mongo_chunks_deleted": chunks_deleted.deleted_count,
        "mongo_document_deleted": bool(document_deleted.deleted_count),
        "deleted_at": deleted_at,
    }


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status: str | None = None,
    language: str | None = None,
    tags: str | None = None,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    mongo: MongoDatabase = Depends(get_mongo),
):
    """List indexed documents with optional filtering and pagination."""

    filters = {}
    if status:
        filters["status"] = status
    if language:
        filters["language"] = language
    if tags:
        filters["tags"] = {"$all": [tag.strip() for tag in tags.split(",") if tag.strip()]}
    total = await mongo.collection("documents").count_documents(filters)
    cursor = (
        mongo.collection("documents")
        .find(filters, {"_id": 0})
        .sort("uploaded_at", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )
    records = await cursor.to_list(length=per_page)
    return {
        "documents": records,
        "pagination": {"total": total, "page": page, "per_page": per_page},
    }


@router.get("/{doc_id}/status")
async def get_document_status(
    doc_id: str,
    _current_user: AuthenticatedUser = Depends(get_admin_user),
    mongo: MongoDatabase = Depends(get_mongo),
):
    """Return the latest persisted ingestion state for a document."""

    document = await mongo.collection("documents").find_one({"doc_id": doc_id}, {"_id": 0})
    if not document:
        raise DocumentNotFoundError(f"No document with id: {doc_id}")
    status = document.get("status")
    return {
        "doc_id": doc_id,
        "status": status,
        "progress_percent": 100 if status == "indexed" else 0,
        "current_step": document.get("current_step"),
        "estimated_remaining_seconds": 0 if status == "indexed" else None,
        "batch_id": document.get("batch_id"),
        "error_detail": document.get("error_detail"),
    }
