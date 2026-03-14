from __future__ import annotations

from dataclasses import dataclass

from nakheel.config import Settings

try:
    from FlagEmbedding import FlagReranker
except ImportError:  # pragma: no cover
    FlagReranker = None

from .hybrid_search import CandidateChunk


@dataclass(slots=True)
class ScoredChunk:
    chunk: CandidateChunk
    score: float


class RerankerService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        if FlagReranker is not None:
            try:
                self._model = FlagReranker(settings.BGE_RERANKER_MODEL, use_fp16=settings.BGE_USE_FP16)
            except Exception:
                self._model = None

    def rerank(self, query: str, candidates: list[CandidateChunk]) -> list[ScoredChunk]:
        if not candidates:
            return []
        if self._model is not None:
            pairs = [(query, item.chunk.text) for item in candidates]
            scores = self._model.compute_score(pairs, normalize=True)
        else:
            query_terms = set(query.lower().split())
            scores = []
            for item in candidates:
                chunk_terms = set(item.chunk.text.lower().split())
                overlap = len(query_terms & chunk_terms)
                denom = max(1, len(query_terms))
                scores.append(min(1.0, overlap / denom + item.retrieval_score))
        reranked = [ScoredChunk(chunk=item, score=float(score)) for item, score in zip(candidates, scores)]
        reranked.sort(key=lambda item: item.score, reverse=True)
        return reranked[: self.settings.RERANKER_TOP_K]

    def is_model_loaded(self) -> bool:
        return self._model is not None

    def startup_check(self) -> dict[str, str | bool]:
        if self._model is None:
            return {"ok": False, "detail": "BGE reranker model is not loaded"}
        score = self._model.compute_score([("startup check", "startup check")], normalize=True)
        if isinstance(score, list):
            score = score[0]
        return {"ok": float(score) >= 0.0, "detail": "reranker model loaded"}
