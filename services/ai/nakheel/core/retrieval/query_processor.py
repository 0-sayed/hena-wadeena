from __future__ import annotations

import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock

from nakheel.core.ingestion.embedder import DenseEmbedder
from nakheel.core.ingestion.sparse_embedder import SparseEmbedder
from nakheel.utils.language import LanguageDetectionResult, detect_language
from nakheel.utils.text_cleaning import clean_text, normalize_arabic


@dataclass(slots=True)
class ProcessedQuery:
    original_text: str
    normalized_text: str
    dense_vector: list[float]
    sparse_vector: dict[int, float]
    language: LanguageDetectionResult


class QueryProcessor:
    """Normalizes incoming queries and prepares hybrid-search features."""

    def __init__(self, dense_embedder: DenseEmbedder, sparse_embedder: SparseEmbedder) -> None:
        self.dense_embedder = dense_embedder
        self.sparse_embedder = sparse_embedder
        self._cache: OrderedDict[str, ProcessedQuery] = OrderedDict()
        self._cache_lock = Lock()
        self._cache_size = getattr(
            getattr(dense_embedder, "settings", None), "QUERY_CACHE_SIZE", 128
        )

    def _get_cached(self, normalized: str, original_text: str) -> ProcessedQuery | None:
        if self._cache_size <= 0:
            return None
        with self._cache_lock:
            cached = self._cache.get(normalized)
            if cached is None:
                return None
            self._cache.move_to_end(normalized)
        return ProcessedQuery(
            original_text=original_text,
            normalized_text=cached.normalized_text,
            dense_vector=list(cached.dense_vector),
            sparse_vector=dict(cached.sparse_vector),
            language=cached.language,
        )

    def _store_cache(self, processed: ProcessedQuery) -> None:
        if self._cache_size <= 0:
            return
        cached = ProcessedQuery(
            original_text=processed.normalized_text,
            normalized_text=processed.normalized_text,
            dense_vector=list(processed.dense_vector),
            sparse_vector=dict(processed.sparse_vector),
            language=processed.language,
        )
        with self._cache_lock:
            self._cache[processed.normalized_text] = cached
            self._cache.move_to_end(processed.normalized_text)
            while len(self._cache) > self._cache_size:
                self._cache.popitem(last=False)

    def process(self, query: str) -> ProcessedQuery:
        """Synchronous helper kept for non-request contexts and tests."""

        cleaned = clean_text(query)
        language = detect_language(cleaned)
        normalized = normalize_arabic(cleaned) if language.code.startswith("ar") else cleaned
        cached = self._get_cached(normalized, query)
        if cached is not None:
            return cached
        processed = ProcessedQuery(
            original_text=query,
            normalized_text=normalized,
            dense_vector=self.dense_embedder.embed_query(normalized),
            sparse_vector=self.sparse_embedder.transform_query(normalized),
            language=language,
        )
        self._store_cache(processed)
        return processed

    async def process_async(self, query: str) -> ProcessedQuery:
        """Build dense and sparse query features without blocking the event loop."""

        cleaned = clean_text(query)
        language = detect_language(cleaned)
        normalized = normalize_arabic(cleaned) if language.code.startswith("ar") else cleaned
        cached = self._get_cached(normalized, query)
        if cached is not None:
            return cached
        dense_vector, sparse_vector = await asyncio.gather(
            self.dense_embedder.embed_query_async(normalized),
            asyncio.to_thread(self.sparse_embedder.transform_query, normalized),
        )
        processed = ProcessedQuery(
            original_text=query,
            normalized_text=normalized,
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            language=language,
        )
        self._store_cache(processed)
        return processed
