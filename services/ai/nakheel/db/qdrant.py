from __future__ import annotations

import asyncio
import re
from types import SimpleNamespace
from uuid import NAMESPACE_URL, UUID, uuid5

from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import (
    Distance,
    HnswConfigDiff,
    OptimizersConfigDiff,
    PointStruct,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

from nakheel.config import Settings

try:
    from llama_index.core.vector_stores.types import VectorStoreQuery
    from llama_index.vector_stores.qdrant import QdrantVectorStore
except ImportError:  # pragma: no cover
    VectorStoreQuery = None
    QdrantVectorStore = None


LEGACY_POINT_ID_RE = re.compile(
    r"^[A-Za-z0-9_]+-(?P<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$"
)
LLAMA_INDEX_DENSE_VECTOR_NAME = "text-dense"


class QdrantDatabase:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: QdrantClient | None = None
        self._vector_store = None
        self._vector_store_checked = False

    def connect(self) -> None:
        self.client = QdrantClient(
            host=self.settings.QDRANT_HOST,
            port=self.settings.QDRANT_PORT,
            api_key=self.settings.QDRANT_API_KEY or None,
            https=self.settings.QDRANT_USE_HTTPS,
        )

    def close(self) -> None:
        if self.client is not None:
            self.client.close()
        self._vector_store = None
        self._vector_store_checked = False

    def ensure_collection(self) -> None:
        assert self.client is not None
        try:
            self.client.get_collection(self.settings.QDRANT_COLLECTION)
            return
        except UnexpectedResponse:
            pass
        self.client.create_collection(
            collection_name=self.settings.QDRANT_COLLECTION,
            vectors_config={
                "dense": VectorParams(
                    size=self.settings.OPENAI_EMBEDDING_DIMENSIONS,
                    distance=Distance.COSINE,
                    on_disk=False,
                    hnsw_config=HnswConfigDiff(m=16, ef_construct=200),
                )
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))
            },
            optimizers_config=OptimizersConfigDiff(indexing_threshold=10000),
        )

    def ping(self) -> bool:
        try:
            assert self.client is not None
            self.client.get_collections()
            return True
        except Exception:
            return False

    def llama_index_backend_available(self) -> bool:
        return self._get_vector_store() is not None

    def upsert_points(self, points: list) -> None:
        assert self.client is not None
        self.client.upsert(
            collection_name=self.settings.QDRANT_COLLECTION,
            points=self._normalize_points(points),
        )

    async def upsert_points_async(self, points: list) -> None:
        await asyncio.to_thread(self.upsert_points, points)

    def delete_points(self, point_ids: list[str]) -> None:
        assert self.client is not None
        self.client.delete(
            collection_name=self.settings.QDRANT_COLLECTION,
            points_selector=[self.normalize_point_id(point_id) for point_id in point_ids],
        )

    async def delete_points_async(self, point_ids: list[str]) -> None:
        await asyncio.to_thread(self.delete_points, point_ids)

    def dense_search(self, vector: list[float], limit: int):
        vector_store = self._get_vector_store()
        if vector_store is not None and VectorStoreQuery is not None:
            return self._dense_search_with_llama_index(vector_store, vector, limit)
        assert self.client is not None
        return self.client.query_points(
            collection_name=self.settings.QDRANT_COLLECTION,
            query=vector,
            using="dense",
            limit=limit,
            with_payload=True,
        ).points

    async def dense_search_async(self, vector: list[float], limit: int):
        return await asyncio.to_thread(self.dense_search, vector, limit)

    def sparse_search(self, sparse_weights: dict[int, float], limit: int):
        assert self.client is not None
        return self.client.query_points(
            collection_name=self.settings.QDRANT_COLLECTION,
            query=SparseVector(indices=list(sparse_weights.keys()), values=list(sparse_weights.values())),
            using="sparse",
            limit=limit,
            with_payload=True,
        ).points

    async def sparse_search_async(self, sparse_weights: dict[int, float], limit: int):
        return await asyncio.to_thread(self.sparse_search, sparse_weights, limit)

    def _get_vector_store(self):
        if self._vector_store is not None or self._vector_store_checked:
            return self._vector_store
        if self.client is None or QdrantVectorStore is None:
            return None
        self._vector_store_checked = True
        if not self._collection_supports_llama_index():
            return None
        try:
            self._vector_store = QdrantVectorStore(
                client=self.client,
                collection_name=self.settings.QDRANT_COLLECTION,
            )
        except Exception:
            self._vector_store = None
        return self._vector_store

    def _collection_supports_llama_index(self) -> bool:
        assert self.client is not None
        try:
            collection = self.client.get_collection(self.settings.QDRANT_COLLECTION)
        except Exception:
            return False

        vectors = getattr(collection.config.params, "vectors", None)
        if isinstance(vectors, dict):
            vector_names = set(vectors.keys())
        elif hasattr(vectors, "keys"):
            vector_names = set(vectors.keys())
        else:
            vector_names = set()
        return LLAMA_INDEX_DENSE_VECTOR_NAME in vector_names

    @staticmethod
    def normalize_point_id(point_id):
        if isinstance(point_id, int):
            return point_id if point_id >= 0 else str(uuid5(NAMESPACE_URL, str(point_id)))
        if isinstance(point_id, UUID):
            return str(point_id)

        raw_value = str(point_id)
        try:
            return str(UUID(raw_value))
        except ValueError:
            pass

        match = LEGACY_POINT_ID_RE.fullmatch(raw_value)
        if match is not None:
            return str(UUID(match.group("uuid")))
        return str(uuid5(NAMESPACE_URL, raw_value))

    @classmethod
    def _normalize_points(cls, points: list) -> list:
        normalized = []
        for point in points:
            normalized_id = cls.normalize_point_id(point.id)
            if hasattr(point, "model_copy"):
                normalized.append(point.model_copy(update={"id": normalized_id}))
            else:
                normalized.append(
                    PointStruct(
                        id=normalized_id,
                        vector=point.vector,
                        payload=point.payload,
                    )
                )
        return normalized

    @classmethod
    def _normalize_llama_index_result(cls, result) -> list:
        ids = list(getattr(result, "ids", None) or [])
        nodes = list(getattr(result, "nodes", None) or [])
        similarities = list(getattr(result, "similarities", None) or [])
        normalized = []

        if nodes:
            for index, node in enumerate(nodes):
                payload = dict(getattr(node, "metadata", {}) or {})
                chunk_id = payload.get("chunk_id") or (ids[index] if index < len(ids) else getattr(node, "node_id", None))
                payload.setdefault("chunk_id", chunk_id)
                point_id = ids[index] if index < len(ids) else getattr(node, "node_id", None) or chunk_id
                normalized.append(
                    SimpleNamespace(
                        id=cls.normalize_point_id(point_id),
                        payload=payload,
                        score=similarities[index] if index < len(similarities) else None,
                    )
                )
            return normalized

        for index, point_id in enumerate(ids):
            normalized.append(
                SimpleNamespace(
                    id=cls.normalize_point_id(point_id),
                    payload={"chunk_id": point_id},
                    score=similarities[index] if index < len(similarities) else None,
                )
            )
        return normalized

    def _dense_search_with_llama_index(self, vector_store, vector: list[float], limit: int):
        result = vector_store.query(
            VectorStoreQuery(
                query_embedding=vector,
                similarity_top_k=limit,
            )
        )
        return self._normalize_llama_index_result(result)
