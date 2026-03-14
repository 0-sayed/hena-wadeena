from __future__ import annotations

import shutil
import time
from datetime import UTC, datetime

from qdrant_client.models import PointStruct, SparseVector

from nakheel.config import Settings
from nakheel.core.ingestion.chunker import SectionChunker
from nakheel.core.ingestion.embedder import DenseEmbedder
from nakheel.core.ingestion.parser import DocumentParser
from nakheel.core.ingestion.sparse_embedder import SparseEmbedder
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase
from nakheel.exceptions import BadRequestError, IndexingError, NotImplementedMvpError
from nakheel.models.document import DocumentMetadata, DocumentStatus
from nakheel.utils.ids import new_id
from nakheel.utils.language import detect_language
from nakheel.utils.text_cleaning import clean_text


class DocumentIndexer:
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
        if async_mode:
            raise NotImplementedMvpError("Async ingestion is not implemented in the MVP")
        if not filename.lower().endswith(".pdf"):
            raise BadRequestError("Only PDF files are accepted")
        if len(file_bytes) > self.settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise BadRequestError("Maximum file size is 50MB")

        started = time.perf_counter()
        doc_id = new_id("doc")
        working_dir = self.settings.TEMP_DIR / doc_id
        parsed_path = working_dir / "parsed.md"
        pdf_path = working_dir / "original.pdf"
        working_dir.mkdir(parents=True, exist_ok=True)
        pdf_path.write_bytes(file_bytes)
        try:
            markdown, pages = self.parser.parse_to_markdown(pdf_path, parsed_path)
            return await self._index_text_content(
                doc_id=doc_id,
                filename=filename,
                source_type="pdf",
                raw_text=markdown,
                title=title,
                description=description,
                tags=tags,
                language_hint=language_hint,
                file_size_kb=round(len(file_bytes) / 1024, 2),
                total_pages=pages,
                started=started,
            )
        except Exception as exc:
            if isinstance(exc, (BadRequestError, NotImplementedMvpError, IndexingError)):
                raise
            raise IndexingError("Failed to index document", extras={"doc_id": doc_id}) from exc
        finally:
            shutil.rmtree(working_dir, ignore_errors=True)

    async def inject_raw_text(
        self,
        content: str,
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str = "auto",
    ) -> dict:
        cleaned = clean_text(content)
        if not cleaned:
            raise BadRequestError("Content cannot be empty")
        doc_id = new_id("doc")
        started = time.perf_counter()
        return await self._index_text_content(
            doc_id=doc_id,
            filename="copied_doc",
            source_type="copied_doc",
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
        if not filename.lower().endswith(".pdf"):
            raise BadRequestError("Only PDF files are accepted")
        temp_id = new_id("tmp")
        working_dir = self.settings.TEMP_DIR / temp_id
        pdf_path = working_dir / "original.pdf"
        parsed_path = working_dir / "parsed.md"
        working_dir.mkdir(parents=True, exist_ok=True)
        pdf_path.write_bytes(file_bytes)
        started = time.perf_counter()
        try:
            markdown, pages = self.parser.parse_to_markdown(pdf_path, parsed_path)
            return {
                "filename": filename,
                "format": "markdown",
                "content": markdown,
                "total_pages": pages,
                "word_count": len(markdown.split()),
                "language_detected": detect_language(markdown[:1000]).code,
                "processing_time_ms": int((time.perf_counter() - started) * 1000),
            }
        finally:
            shutil.rmtree(working_dir, ignore_errors=True)

    async def _index_text_content(
        self,
        doc_id: str,
        filename: str,
        source_type: str,
        raw_text: str,
        title: str | None,
        description: str | None,
        tags: list[str],
        language_hint: str,
        file_size_kb: float,
        total_pages: int,
        started: float,
    ) -> dict:
        document = DocumentMetadata(
            doc_id=doc_id,
            filename=filename,
            source_type=source_type,
            title=title,
            description=description,
            tags=tags,
            uploaded_at=datetime.now(UTC),
            status=DocumentStatus.PENDING,
            file_size_kb=file_size_kb,
        )
        await self.mongo.collection("documents").insert_one(document.model_dump(mode="json"))
        try:
            await self.mongo.collection("documents").update_one(
                {"doc_id": doc_id},
                {"$set": {"status": DocumentStatus.PROCESSING.value, "current_step": "chunking"}},
            )
            chunks = self.chunker.chunk_markdown(raw_text, doc_id)
            if not chunks:
                raise IndexingError("No valid chunks were produced")

            language = detect_language(raw_text[:1000]).code if language_hint == "auto" else language_hint
            dense_vectors = self.dense_embedder.embed_texts([chunk.text for chunk in chunks])
            sparse_vectors = self.sparse_embedder.fit_transform([chunk.text for chunk in chunks])

            points = []
            qdrant_ids: list[str] = []
            for chunk, dense_vec, sparse_vec in zip(chunks, dense_vectors, sparse_vectors):
                qdrant_ids.append(chunk.chunk_id)
                points.append(
                    PointStruct(
                        id=chunk.chunk_id,
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
                            "language": chunk.language,
                            "page_numbers": chunk.page_numbers,
                            "token_count": chunk.token_count,
                            "doc_filename": filename,
                            "doc_title": title,
                            "source_type": source_type,
                            "tags": tags,
                        },
                    )
                )
            self.qdrant.upsert_points(points)
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
                    }
                },
            )
            await self.mongo.collection("audit_logs").insert_one(
                {
                    "event": "document_indexed",
                    "doc_id": doc_id,
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
        except Exception:
            await self.mongo.collection("documents").update_one(
                {"doc_id": doc_id},
                {"$set": {"status": DocumentStatus.FAILED.value, "current_step": "failed"}},
            )
            raise
