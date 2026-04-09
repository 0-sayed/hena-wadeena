from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from dataclasses import dataclass

from nakheel.config import Settings
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase
from nakheel.models.chunk import Chunk

from .query_processor import ProcessedQuery
from .rrf_fusion import fuse_ranked_results


@dataclass(slots=True)
class CandidateChunk:
    chunk: Chunk
    retrieval_score: float


class HybridSearchService:
    """Runs dense and sparse retrieval, then merges results with RRF."""

    def __init__(self, settings: Settings, qdrant: QdrantDatabase, mongo: MongoDatabase) -> None:
        self.settings = settings
        self.qdrant = qdrant
        self.mongo = mongo

    @staticmethod
    def _hydrate_chunk_from_payload(payload: dict | None) -> Chunk | None:
        if not payload:
            return None
        chunk_id = payload.get("chunk_id")
        doc_id = payload.get("doc_id")
        text = payload.get("text")
        language = payload.get("language")
        chunk_index = payload.get("chunk_index")
        token_count = payload.get("token_count")
        if (
            not isinstance(chunk_id, str)
            or not isinstance(doc_id, str)
            or not isinstance(text, str)
            or not isinstance(language, str)
            or not isinstance(chunk_index, int)
            or not isinstance(token_count, int)
        ):
            return None
        page_numbers = payload.get("page_numbers")
        return Chunk(
            chunk_id=chunk_id,
            doc_id=doc_id,
            chunk_index=chunk_index,
            section_title=payload.get("section_title"),
            parent_section=payload.get("parent_section"),
            text=text,
            text_ar=None,
            language=language,
            page_numbers=page_numbers if isinstance(page_numbers, list) else [],
            token_count=token_count,
            char_count=len(text),
            overlap_prev=None,
            overlap_next=None,
            created_at=datetime.now(UTC),
        )

    async def search(self, query: ProcessedQuery) -> list[CandidateChunk]:
        """Search Qdrant and hydrate the matching chunks from MongoDB."""

        dense_results, sparse_results = await asyncio.gather(
            self.qdrant.dense_search_async(query.dense_vector, self.settings.DENSE_TOP_K),
            self.qdrant.sparse_search_async(query.sparse_vector, self.settings.SPARSE_TOP_K),
        )
        fused = fuse_ranked_results(
            dense_results,
            sparse_results,
            k=self.settings.RRF_K,
            dense_weight=self.settings.DENSE_WEIGHT,
            sparse_weight=self.settings.SPARSE_WEIGHT,
            top_n=self.settings.RRF_TOP_N,
        )
        chunk_ids = [item["point"].payload["chunk_id"] for item in fused]
        if not chunk_ids:
            return []
        chunk_map: dict[str, Chunk] = {}
        missing_chunk_ids: list[str] = []
        for item in fused:
            point = item["point"]
            payload = getattr(point, "payload", None)
            chunk_id = payload.get("chunk_id") if isinstance(payload, dict) else None
            hydrated = self._hydrate_chunk_from_payload(
                payload if isinstance(payload, dict) else None
            )
            if hydrated is not None:
                chunk_map[hydrated.chunk_id] = hydrated
            elif isinstance(chunk_id, str):
                missing_chunk_ids.append(chunk_id)

        if missing_chunk_ids:
            cursor = self.mongo.collection("chunks").find({"chunk_id": {"$in": missing_chunk_ids}})
            chunk_docs = await cursor.to_list(length=len(missing_chunk_ids))
            chunk_map.update({item["chunk_id"]: Chunk.model_validate(item) for item in chunk_docs})
        return [
            CandidateChunk(
                chunk=chunk_map[item["point"].payload["chunk_id"]], retrieval_score=item["score"]
            )
            for item in fused
            if item["point"].payload["chunk_id"] in chunk_map
        ]
