from __future__ import annotations

import asyncio
import json
import shutil
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from qdrant_client.models import PointStruct, SparseVector

from nakheel.config import Settings
from nakheel.core.ingestion.chunker import SectionChunker
from nakheel.core.ingestion.embedder import DenseEmbedder
from nakheel.core.ingestion.parser import DocumentParser
from nakheel.core.ingestion.sparse_embedder import SparseEmbedder
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase
from nakheel.exceptions import (
    BadRequestError,
    DocumentBatchNotFoundError,
    IndexingError,
    ParsedFileExpiredError,
    ParsedFileNotFoundError,
)
from nakheel.models.document import (
    DocumentBatchItem,
    DocumentBatchMetadata,
    DocumentBatchStatus,
    DocumentMetadata,
    DocumentSourceType,
    DocumentStatus,
)
from nakheel.utils.ids import new_id
from nakheel.utils.language import detect_language
from nakheel.utils.text_cleaning import clean_text


@dataclass(slots=True)
class QueuedPdf:
    filename: str
    file_bytes: bytes


class DocumentIndexer:
    """Coordinates parsing, chunking, embedding, and persistence for new knowledge sources."""

    def __init__(
        self,
        settings: Settings,
        mongo: MongoDatabase,
        qdrant: QdrantDatabase,
        parser: DocumentParser,
        dense_embedder: DenseEmbedder,
        sparse_embedder: SparseEmbedder,
    ) -> None:
        self.settings = settings
        self.mongo = mongo
        self.qdrant = qdrant
        self.parser = parser
        self.dense_embedder = dense_embedder
        self.sparse_embedder = sparse_embedder
        self.chunker = SectionChunker(
            min_tokens=settings.CHUNK_MIN_TOKENS,
            max_tokens=settings.CHUNK_MAX_TOKENS,
            overlap_ratio=settings.CHUNK_OVERLAP_RATIO,
        )

    async def inject_document(
        self,
        filename: str,
        file_bytes: bytes,
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str = "auto",
        async_mode: bool = False,
    ) -> dict:
        """Index an uploaded PDF into MongoDB and Qdrant."""

        if async_mode:
            raise BadRequestError("Use the batch upload flow for async PDF ingestion")
        doc_id = new_id("doc")
        return await self._index_pdf_document(
            doc_id=doc_id,
            batch_id=None,
            filename=filename,
            file_bytes=file_bytes,
            title=title,
            description=description,
            tags=tags,
            language_hint=language_hint,
            create_record=True,
        )

    async def create_document_batch(
        self,
        files: list[QueuedPdf],
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str = "auto",
    ) -> dict:
        """Persist a PDF ingestion batch and stage files for background processing."""

        if not files:
            raise BadRequestError("At least one PDF file is required")

        batch_id = new_id("batch")
        batch_dir = self.settings.TEMP_DIR / batch_id
        created_at = datetime.now(UTC)
        items: list[DocumentBatchItem] = []

        for queued_file in files:
            filename = queued_file.filename or "document.pdf"
            doc_id = new_id("doc")
            file_size_kb = round(len(queued_file.file_bytes) / 1024, 2)
            item = DocumentBatchItem(doc_id=doc_id, filename=filename, current_step="validating")
            try:
                self._validate_pdf_upload(filename, queued_file.file_bytes)
                doc_dir = batch_dir / doc_id
                doc_dir.mkdir(parents=True, exist_ok=True)
                (doc_dir / "original.pdf").write_bytes(queued_file.file_bytes)
                item.current_step = "queued"
                await self._create_document_record(
                    doc_id=doc_id,
                    batch_id=batch_id,
                    filename=filename,
                    source_type=DocumentSourceType.PDF,
                    title=title,
                    description=description,
                    tags=tags,
                    file_size_kb=file_size_kb,
                    status=DocumentStatus.PENDING,
                    current_step=item.current_step,
                )
            except Exception as exc:
                item.status = DocumentStatus.FAILED
                item.current_step = "validation_failed"
                item.error_detail = self._error_detail(exc)
                await self._create_document_record(
                    doc_id=doc_id,
                    batch_id=batch_id,
                    filename=filename,
                    source_type=DocumentSourceType.PDF,
                    title=title,
                    description=description,
                    tags=tags,
                    file_size_kb=file_size_kb,
                    status=DocumentStatus.FAILED,
                    current_step="validation_failed",
                    error_detail=item.error_detail,
                )
            items.append(item)

        batch = DocumentBatchMetadata(
            batch_id=batch_id,
            status=self._derive_batch_status(items),
            title=title,
            description=description,
            tags=tags,
            language_hint=language_hint,
            created_at=created_at,
            updated_at=created_at,
            completed_at=created_at if self._is_batch_terminal(items) else None,
            items=items,
        )
        await self.mongo.collection("document_batches").insert_one(batch.model_dump(mode="json"))
        return self._summarize_batch(batch.model_dump(mode="json"))

    async def process_document_batch(self, batch_id: str) -> None:
        """Process a previously staged batch without blocking the request lifecycle."""

        batch = await self.mongo.collection("document_batches").find_one({"batch_id": batch_id}, {"_id": 0})
        if not batch:
            raise DocumentBatchNotFoundError(f"No document batch with id: {batch_id}")

        if self._is_batch_terminal(batch["items"]):
            return

        batch["status"] = DocumentBatchStatus.PROCESSING.value
        batch["updated_at"] = datetime.now(UTC)
        await self._save_batch(batch)

        batch_dir = self.settings.TEMP_DIR / batch_id
        try:
            for item in batch["items"]:
                if item["status"] != DocumentStatus.PENDING.value:
                    continue

                item["status"] = DocumentStatus.PROCESSING.value
                item["current_step"] = "parsing"
                item["error_detail"] = None
                batch["updated_at"] = datetime.now(UTC)
                batch["status"] = DocumentBatchStatus.PROCESSING.value
                await self._save_batch(batch)

                file_path = batch_dir / item["doc_id"] / "original.pdf"
                try:
                    async def track_progress(step: str) -> None:
                        item["status"] = DocumentStatus.PROCESSING.value
                        item["current_step"] = step
                        item["error_detail"] = None
                        batch["updated_at"] = datetime.now(UTC)
                        batch["status"] = DocumentBatchStatus.PROCESSING.value
                        await self._save_batch(batch)

                    result = await self._index_pdf_document(
                        doc_id=item["doc_id"],
                        batch_id=batch_id,
                        filename=item["filename"],
                        file_bytes=file_path.read_bytes(),
                        title=batch.get("title"),
                        description=batch.get("description"),
                        tags=batch.get("tags", []),
                        language_hint=batch.get("language_hint", "auto"),
                        create_record=False,
                        progress_callback=track_progress,
                    )
                    item["status"] = DocumentStatus.INDEXED.value
                    item["current_step"] = "indexed"
                    item["error_detail"] = None
                    item["total_pages"] = result["total_pages"]
                    item["total_chunks"] = result["total_chunks"]
                    item["language"] = result["language"]
                    item["indexed_at"] = result["indexed_at"]
                except Exception as exc:
                    item["status"] = DocumentStatus.FAILED.value
                    item["current_step"] = "failed"
                    item["error_detail"] = self._error_detail(exc)
                finally:
                    if file_path.exists():
                        file_path.unlink()
                    shutil.rmtree(file_path.parent, ignore_errors=True)

                batch["updated_at"] = datetime.now(UTC)
                batch["status"] = self._derive_batch_status(batch["items"]).value
                if self._is_batch_terminal(batch["items"]):
                    batch["completed_at"] = batch["updated_at"]
                await self._save_batch(batch)
        finally:
            shutil.rmtree(batch_dir, ignore_errors=True)

    async def get_document_batch_status(self, batch_id: str) -> dict:
        """Return the latest persisted status for an ingestion batch."""

        batch = await self.mongo.collection("document_batches").find_one({"batch_id": batch_id}, {"_id": 0})
        if not batch:
            raise DocumentBatchNotFoundError(f"No document batch with id: {batch_id}")
        return self._summarize_batch(batch)

    async def inject_raw_text(
        self,
        content: str,
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str = "auto",
    ) -> dict:
        """Index pasted raw text as a copied document source."""

        cleaned = clean_text(content)
        if not cleaned:
            raise BadRequestError("Content cannot be empty")
        doc_id = new_id("doc")
        started = time.perf_counter()
        await self._create_document_record(
            doc_id=doc_id,
            batch_id=None,
            filename="copied_doc",
            source_type=DocumentSourceType.COPIED_DOC,
            title=title,
            description=description,
            tags=tags,
            file_size_kb=round(len(cleaned.encode("utf-8")) / 1024, 2),
        )
        return await self._index_text_content(
            doc_id=doc_id,
            batch_id=None,
            filename="copied_doc",
            source_type=DocumentSourceType.COPIED_DOC,
            raw_text=cleaned,
            title=title,
            description=description,
            tags=tags,
            language_hint=language_hint,
            file_size_kb=round(len(cleaned.encode("utf-8")) / 1024, 2),
            total_pages=1,
            started=started,
        )

    async def parse_only(self, filename: str, file_bytes: bytes) -> dict:
        """Parse a PDF into a temporary Markdown artifact without indexing it."""

        self._validate_pdf_upload(filename, file_bytes)
        self._cleanup_expired_parsed_files()
        parse_id = new_id("parsed")
        working_dir = self.settings.TEMP_DIR / "parsed" / parse_id
        pdf_path = working_dir / "original.pdf"
        markdown_filename = f"{self._safe_markdown_stem(filename)}.md"
        parsed_path = working_dir / markdown_filename
        metadata_path = working_dir / "metadata.json"
        working_dir.mkdir(parents=True, exist_ok=True)
        pdf_path.write_bytes(file_bytes)
        started = time.perf_counter()
        try:
            markdown, pages = await self.parser.parse_to_markdown_async(pdf_path, parsed_path)
            expires_at = datetime.now(UTC) + self._parsed_file_ttl()
            metadata = {
                "parse_id": parse_id,
                "filename": filename,
                "markdown_filename": markdown_filename,
                "format": "markdown",
                "total_pages": pages,
                "word_count": len(markdown.split()),
                "language_detected": detect_language(markdown[:1000]).code,
                "processing_time_ms": int((time.perf_counter() - started) * 1000),
                "expires_at": expires_at.isoformat(),
            }
            metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
            return {
                **metadata,
                "expires_at": expires_at,
            }
        except Exception:
            shutil.rmtree(working_dir, ignore_errors=True)
            raise
        finally:
            if pdf_path.exists():
                pdf_path.unlink()

    def resolve_parsed_markdown(self, parse_id: str) -> dict:
        """Resolve a staged Markdown artifact or raise if it is missing/expired."""

        working_dir = self.settings.TEMP_DIR / "parsed" / parse_id
        metadata_path = working_dir / "metadata.json"
        if not metadata_path.exists():
            raise ParsedFileNotFoundError(f"No parsed markdown file with id: {parse_id}")
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        expires_at = datetime.fromisoformat(metadata["expires_at"])
        if expires_at <= datetime.now(UTC):
            shutil.rmtree(working_dir, ignore_errors=True)
            raise ParsedFileExpiredError(f"Parsed markdown file expired: {parse_id}")
        markdown_path = working_dir / metadata["markdown_filename"]
        if not markdown_path.exists():
            raise ParsedFileNotFoundError(f"No parsed markdown file with id: {parse_id}")
        return {
            "path": markdown_path,
            "markdown_filename": metadata["markdown_filename"],
            "expires_at": expires_at,
        }

    async def _index_pdf_document(
        self,
        doc_id: str,
        batch_id: str | None,
        filename: str,
        file_bytes: bytes,
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str,
        create_record: bool,
        progress_callback=None,
    ) -> dict:
        """Parse and index a PDF source."""

        self._validate_pdf_upload(filename, file_bytes)
        file_size_kb = round(len(file_bytes) / 1024, 2)
        if create_record:
            await self._create_document_record(
                doc_id=doc_id,
                batch_id=batch_id,
                filename=filename,
                source_type=DocumentSourceType.PDF,
                title=title,
                description=description,
                tags=tags,
                file_size_kb=file_size_kb,
            )

        started = time.perf_counter()
        working_dir = self.settings.TEMP_DIR / doc_id
        parsed_path = working_dir / "parsed.md"
        pdf_path = working_dir / "original.pdf"
        working_dir.mkdir(parents=True, exist_ok=True)
        pdf_path.write_bytes(file_bytes)
        try:
            await self._set_document_state(doc_id, status=DocumentStatus.PROCESSING, current_step="parsing")
            if progress_callback is not None:
                await progress_callback("parsing")
            markdown, pages = await self.parser.parse_to_markdown_async(pdf_path, parsed_path)
        except Exception as exc:
            await self._mark_document_failed(doc_id, self._error_detail(exc))
            raise IndexingError("Failed to index document", extras={"doc_id": doc_id}) from exc
        finally:
            shutil.rmtree(working_dir, ignore_errors=True)

        return await self._index_text_content(
            doc_id=doc_id,
            batch_id=batch_id,
            filename=filename,
            source_type=DocumentSourceType.PDF,
            raw_text=markdown,
            title=title,
            description=description,
            tags=tags,
            language_hint=language_hint,
            file_size_kb=file_size_kb,
            total_pages=pages,
            started=started,
            progress_callback=progress_callback,
        )

    async def _index_text_content(
        self,
        doc_id: str,
        batch_id: str | None,
        filename: str,
        source_type: DocumentSourceType,
        raw_text: str,
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str,
        file_size_kb: float,
        total_pages: int,
        started: float,
        progress_callback=None,
    ) -> dict:
        """Persist a text source after chunking and embedding it."""

        qdrant_ids: list[str] = []
        points: list[PointStruct] = []
        upsert_succeeded = False
        document_marked_indexed = False
        try:
            await self._set_document_state(doc_id, status=DocumentStatus.PROCESSING, current_step="chunking")
            if progress_callback is not None:
                await progress_callback("chunking")
            chunks = self.chunker.chunk_markdown(raw_text, doc_id)
            if not chunks:
                raise IndexingError("No valid chunks were produced")

            language = detect_language(raw_text[:1000]).code if language_hint == "auto" else language_hint
            await self._set_document_state(doc_id, status=DocumentStatus.PROCESSING, current_step="embedding")
            if progress_callback is not None:
                await progress_callback("embedding")
            dense_vectors, sparse_vectors = await asyncio.gather(
                self.dense_embedder.embed_texts_async([chunk.text for chunk in chunks]),
                asyncio.to_thread(self.sparse_embedder.fit_transform, [chunk.text for chunk in chunks]),
            )

            for chunk, dense_vec, sparse_vec in zip(chunks, dense_vectors, sparse_vectors):
                point_id = self.qdrant.normalize_point_id(chunk.chunk_id)
                qdrant_ids.append(point_id)
                points.append(
                    PointStruct(
                        id=point_id,
                        vector={
                            "dense": dense_vec,
                            "sparse": SparseVector(
                                indices=list(sparse_vec.keys()),
                                values=list(sparse_vec.values()),
                            ),
                        },
                        payload={
                            "chunk_id": chunk.chunk_id,
                            "doc_id": chunk.doc_id,
                            "chunk_index": chunk.chunk_index,
                            "section_title": chunk.section_title,
                            "parent_section": chunk.parent_section,
                            "text": chunk.text,
                            "language": chunk.language,
                            "page_numbers": chunk.page_numbers,
                            "token_count": chunk.token_count,
                            "doc_filename": filename,
                            "doc_title": title,
                            "source_type": source_type,
                            "tags": tags,
                            "batch_id": batch_id,
                        },
                    )
                )
            await self._set_document_state(doc_id, status=DocumentStatus.PROCESSING, current_step="persisting")
            if progress_callback is not None:
                await progress_callback("persisting")
            await self.qdrant.upsert_points_async(points)
            upsert_succeeded = True
            await self.mongo.collection("chunks").insert_many([chunk.model_dump(mode="json") for chunk in chunks])
            indexed_at = datetime.now(UTC)
            await self.mongo.collection("documents").update_one(
                {"doc_id": doc_id},
                {
                    "$set": {
                        "status": DocumentStatus.INDEXED.value,
                        "indexed_at": indexed_at,
                        "total_pages": total_pages,
                        "total_chunks": len(chunks),
                        "language": language,
                        "qdrant_ids": qdrant_ids,
                        "current_step": "indexed",
                        "description": description,
                        "file_size_kb": file_size_kb,
                        "error_detail": None,
                    }
                },
            )
            document_marked_indexed = True
            await self.mongo.collection("audit_logs").insert_one(
                {
                    "event": "document_indexed",
                    "doc_id": doc_id,
                    "batch_id": batch_id,
                    "source_type": source_type,
                    "created_at": datetime.now(UTC),
                    "chunk_count": len(chunks),
                }
            )
            return {
                "doc_id": doc_id,
                "status": DocumentStatus.INDEXED.value,
                "filename": filename,
                "total_pages": total_pages,
                "total_chunks": len(chunks),
                "language": language,
                "indexed_at": indexed_at,
                "qdrant_point_count": len(points),
                "processing_time_ms": int((time.perf_counter() - started) * 1000),
            }
        except Exception as exc:
            if upsert_succeeded and not document_marked_indexed:
                try:
                    await self.qdrant.delete_points_async(qdrant_ids)
                except Exception:
                    pass
            if not document_marked_indexed:
                await self._mark_document_failed(doc_id, self._error_detail(exc))
            raise

    async def _create_document_record(
        self,
        doc_id: str,
        batch_id: str | None,
        filename: str,
        source_type: DocumentSourceType,
        title: str | None,
        description: str | None,
        tags: list[str],
        file_size_kb: float,
        status: DocumentStatus = DocumentStatus.PENDING,
        current_step: str | None = None,
        error_detail: str | None = None,
    ) -> None:
        """Create a MongoDB document metadata record before ingestion starts."""

        document = DocumentMetadata(
            doc_id=doc_id,
            batch_id=batch_id,
            filename=filename,
            source_type=source_type,
            title=title,
            description=description,
            tags=tags,
            uploaded_at=datetime.now(UTC),
            status=status,
            file_size_kb=file_size_kb,
            current_step=current_step,
            error_detail=error_detail,
        )
        await self.mongo.collection("documents").insert_one(document.model_dump(mode="json"))

    async def _set_document_state(
        self,
        doc_id: str,
        status: DocumentStatus,
        current_step: str,
        error_detail: str | None = None,
    ) -> None:
        """Update the persisted state for a single document."""

        await self.mongo.collection("documents").update_one(
            {"doc_id": doc_id},
            {
                "$set": {
                    "status": status.value,
                    "current_step": current_step,
                    "error_detail": error_detail,
                }
            },
        )

    async def _mark_document_failed(self, doc_id: str, detail: str) -> None:
        """Persist a terminal failed state for a document."""

        await self.mongo.collection("documents").update_one(
            {"doc_id": doc_id},
            {
                "$set": {
                    "status": DocumentStatus.FAILED.value,
                    "current_step": "failed",
                    "error_detail": detail,
                }
            },
        )

    async def _save_batch(self, batch: dict) -> None:
        """Persist the current batch snapshot without MongoDB internals."""

        await self.mongo.collection("document_batches").update_one(
            {"batch_id": batch["batch_id"]},
            {"$set": batch},
        )

    def _validate_pdf_upload(self, filename: str, file_bytes: bytes) -> None:
        """Validate an uploaded PDF before it enters the ingestion pipeline."""

        if not filename.lower().endswith(".pdf"):
            raise BadRequestError("Only PDF files are accepted")
        if len(file_bytes) > self.settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise BadRequestError(f"Maximum file size is {self.settings.MAX_FILE_SIZE_MB}MB")

    def _derive_batch_status(self, items: list[DocumentBatchItem] | list[dict]) -> DocumentBatchStatus:
        """Collapse per-file states into a single batch-level status."""

        statuses = [item.status if isinstance(item, DocumentBatchItem) else item["status"] for item in items]
        if any(status == DocumentStatus.PROCESSING or status == DocumentStatus.PROCESSING.value for status in statuses):
            return DocumentBatchStatus.PROCESSING
        if any(status == DocumentStatus.PENDING or status == DocumentStatus.PENDING.value for status in statuses):
            return DocumentBatchStatus.PENDING
        indexed_count = sum(status == DocumentStatus.INDEXED or status == DocumentStatus.INDEXED.value for status in statuses)
        failed_count = sum(status == DocumentStatus.FAILED or status == DocumentStatus.FAILED.value for status in statuses)
        total = len(statuses)
        if indexed_count == total:
            return DocumentBatchStatus.COMPLETED
        if failed_count == total:
            return DocumentBatchStatus.FAILED
        return DocumentBatchStatus.COMPLETED_WITH_ERRORS

    def _is_batch_terminal(self, items: list[DocumentBatchItem] | list[dict]) -> bool:
        """Return whether the batch has finished all per-file work."""

        return self._derive_batch_status(items) in {
            DocumentBatchStatus.COMPLETED,
            DocumentBatchStatus.COMPLETED_WITH_ERRORS,
            DocumentBatchStatus.FAILED,
        }

    def _summarize_batch(self, batch: dict) -> dict:
        """Prepare a clean API response for a batch status payload."""

        items = batch.get("items", [])
        pending_files = sum(item["status"] == DocumentStatus.PENDING.value for item in items)
        processing_files = sum(item["status"] == DocumentStatus.PROCESSING.value for item in items)
        indexed_files = sum(item["status"] == DocumentStatus.INDEXED.value for item in items)
        failed_files = sum(item["status"] == DocumentStatus.FAILED.value for item in items)
        return {
            "batch_id": batch["batch_id"],
            "status": batch["status"],
            "total_files": len(items),
            "pending_files": pending_files,
            "processing_files": processing_files,
            "indexed_files": indexed_files,
            "failed_files": failed_files,
            "created_at": batch["created_at"],
            "updated_at": batch["updated_at"],
            "completed_at": batch.get("completed_at"),
            "items": items,
        }

    @staticmethod
    def _error_detail(exc: Exception) -> str:
        """Normalize exceptions into short persisted error messages."""

        detail = getattr(exc, "detail", None)
        return str(detail or exc)

    def _cleanup_expired_parsed_files(self) -> None:
        """Best-effort cleanup for expired parsed Markdown artifacts."""

        parsed_root = self.settings.TEMP_DIR / "parsed"
        if not parsed_root.exists():
            return
        now = datetime.now(UTC)
        for working_dir in parsed_root.iterdir():
            metadata_path = working_dir / "metadata.json"
            if not metadata_path.exists():
                shutil.rmtree(working_dir, ignore_errors=True)
                continue
            try:
                metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
                expires_at = datetime.fromisoformat(metadata["expires_at"])
            except Exception:
                shutil.rmtree(working_dir, ignore_errors=True)
                continue
            if expires_at <= now:
                shutil.rmtree(working_dir, ignore_errors=True)

    def _parsed_file_ttl(self):
        return timedelta(hours=self.settings.PARSED_FILE_TTL_HOURS)

    @staticmethod
    def _safe_markdown_stem(filename: str) -> str:
        stem = filename.rsplit(".", 1)[0].strip() or "parsed"
        safe = "".join(char for char in stem if char.isalnum() or char in {" ", "-", "_"}).strip()
        return safe or "parsed"
