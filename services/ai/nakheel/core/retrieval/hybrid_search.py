from __future__ import annotations

import asyncio
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
        cursor = self.mongo.collection("chunks").find({"chunk_id": {"$in": chunk_ids}})
        chunk_docs = await cursor.to_list(length=len(chunk_ids))
        chunk_map = {item["chunk_id"]: Chunk.model_validate(item) for item in chunk_docs}
        return [
            CandidateChunk(chunk=chunk_map[item["point"].payload["chunk_id"]], retrieval_score=item["score"])
            for item in fused
            if item["point"].payload["chunk_id"] in chunk_map
        ]
