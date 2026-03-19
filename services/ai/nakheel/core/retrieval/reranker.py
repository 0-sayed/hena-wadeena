from __future__ import annotations

import asyncio
import io
import os
import warnings
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass

from nakheel.config import Settings

try:
    from FlagEmbedding import FlagReranker
except ImportError:  # pragma: no cover
    FlagReranker = None

try:
    from huggingface_hub.utils import disable_progress_bars
except ImportError:  # pragma: no cover
    disable_progress_bars = None

try:
    from transformers.utils import logging as transformers_logging
except ImportError:  # pragma: no cover
    transformers_logging = None

from .hybrid_search import CandidateChunk


@dataclass(slots=True)
class ScoredChunk:
    chunk: CandidateChunk
    score: float


def _quiet_third_party_output() -> None:
    """Reduce noisy tokenizer/model logs emitted by the local reranker stack."""

    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
    if disable_progress_bars is not None:
        disable_progress_bars()
    if transformers_logging is not None:
        transformers_logging.set_verbosity_error()
    warnings.filterwarnings(
        "ignore",
        message=r".*XLMRobertaTokenizerFast tokenizer.*",
        category=UserWarning,
    )


def _run_quietly(fn, *args, **kwargs):
    """Capture stdout/stderr for noisy third-party model calls."""

    with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
        return fn(*args, **kwargs)


class RerankerService:
    """Applies a precision-focused reranking step over fused candidates."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        _quiet_third_party_output()
        if FlagReranker is not None:
            try:
                self._model = _run_quietly(
                    FlagReranker,
                    settings.BGE_RERANKER_MODEL,
                    use_fp16=settings.BGE_USE_FP16,
                )
            except Exception:
                self._model = None

    def rerank(self, query: str, candidates: list[CandidateChunk]) -> list[ScoredChunk]:
        """Score candidates synchronously using the configured reranker or fallback."""

        if not candidates:
            return []
        if self._model is not None:
            pairs = [(query, item.chunk.text) for item in candidates]
            scores = _run_quietly(self._model.compute_score, pairs, normalize=True)
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

    async def rerank_async(self, query: str, candidates: list[CandidateChunk]) -> list[ScoredChunk]:
        """Run reranking in a worker thread to keep request handlers responsive."""

        return await asyncio.to_thread(self.rerank, query, candidates)

    def is_model_loaded(self) -> bool:
        return self._model is not None

    def startup_check(self) -> dict[str, str | bool]:
        if self._model is None:
            return {"ok": True, "detail": "using heuristic fallback reranker"}
        try:
            score = _run_quietly(self._model.compute_score, [("startup check", "startup check")], normalize=True)
        except Exception as exc:
            return {"ok": False, "detail": f"reranker startup check failed: {exc}"}
        if isinstance(score, list):
            score = score[0]
        return {"ok": float(score) >= 0.0, "detail": "reranker model loaded"}

    async def startup_check_async(self) -> dict[str, str | bool]:
        return await asyncio.to_thread(self.startup_check)
