from __future__ import annotations

from dataclasses import dataclass

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
    def __init__(self, dense_embedder: DenseEmbedder, sparse_embedder: SparseEmbedder) -> None:
        self.dense_embedder = dense_embedder
        self.sparse_embedder = sparse_embedder

    def process(self, query: str) -> ProcessedQuery:
        cleaned = clean_text(query)
        language = detect_language(cleaned)
        normalized = normalize_arabic(cleaned) if language.code.startswith("ar") else cleaned
        return ProcessedQuery(
            original_text=query,
            normalized_text=normalized,
            dense_vector=self.dense_embedder.embed_query(normalized),
            sparse_vector=self.sparse_embedder.transform_query(normalized),
            language=language,
        )

