from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile

from nakheel.api.deps import get_indexer, get_mongo, get_qdrant
from nakheel.core.ingestion.indexer import DocumentIndexer
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase
from nakheel.exceptions import BadRequestError, DocumentNotFoundError
from nakheel.models.api import RawTextInjectRequest

router = APIRouter(prefix="/documents")


@router.post("/inject")
async def inject_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    language: str = Form(default="auto"),
    async_mode: bool = Form(default=False, alias="async"),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    file_bytes = await file.read()
    parsed_tags = [tag.strip() for tag in tags.split(",")] if tags else []
    return await indexer.inject_document(
        filename=file.filename or "document.pdf",
        file_bytes=file_bytes,
        title=title,
        description=description,
        tags=parsed_tags,
        language_hint=language,
        async_mode=async_mode,
    )


@router.post("/parse")
async def parse_document(
    file: UploadFile = File(...),
    format: str = Form(default="markdown"),
    indexer: DocumentIndexer = Depends(get_indexer),
):
    if format != "markdown":
        raise BadRequestError("Only markdown format is supported in the MVP")
    file_bytes = await file.read()
    return await indexer.parse_only(filename=file.filename or "document.pdf", file_bytes=file_bytes)


@router.post("/inject-text")
async def inject_raw_text(
    payload: RawTextInjectRequest,
    indexer: DocumentIndexer = Depends(get_indexer),
):
    return await indexer.inject_raw_text(
        content=payload.content,
        title=payload.title,
        description=payload.description,
        tags=payload.tags,
        language_hint=payload.language,
    )


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    mongo: MongoDatabase = Depends(get_mongo),
    qdrant: QdrantDatabase = Depends(get_qdrant),
):
    document = await mongo.collection("documents").find_one({"doc_id": doc_id})
    if not document:
        raise DocumentNotFoundError(f"No document with id: {doc_id}")
    if document.get("status") == "processing":
        raise BadRequestError("Cannot delete document while it is being processed")
    qdrant_ids = document.get("qdrant_ids", [])
    if qdrant_ids:
        qdrant.delete_points(qdrant_ids)
    chunks_deleted = await mongo.collection("chunks").delete_many({"doc_id": doc_id})
    document_deleted = await mongo.collection("documents").delete_one({"doc_id": doc_id})
    deleted_at = datetime.now(UTC)
    await mongo.collection("audit_logs").insert_one(
        {"event": "document_deleted", "doc_id": doc_id, "created_at": deleted_at}
    )
    return {
        "doc_id": doc_id,
        "deleted": True,
        "qdrant_points_deleted": len(qdrant_ids),
        "mongo_chunks_deleted": chunks_deleted.deleted_count,
        "mongo_document_deleted": bool(document_deleted.deleted_count),
        "deleted_at": deleted_at,
    }


@router.get("")
async def list_documents(
    page: int = 1,
    per_page: int = 20,
    status: str | None = None,
    language: str | None = None,
    tags: str | None = None,
    mongo: MongoDatabase = Depends(get_mongo),
):
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
        .find(filters)
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
async def get_document_status(doc_id: str, mongo: MongoDatabase = Depends(get_mongo)):
    document = await mongo.collection("documents").find_one({"doc_id": doc_id})
    if not document:
        raise DocumentNotFoundError(f"No document with id: {doc_id}")
    status = document.get("status")
    return {
        "doc_id": doc_id,
        "status": status,
        "progress_percent": 100 if status == "indexed" else 0,
        "current_step": document.get("current_step"),
        "estimated_remaining_seconds": 0 if status == "indexed" else None,
    }
