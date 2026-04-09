from __future__ import annotations

import asyncio
import io
import os
import re
import threading
import warnings
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass

from nakheel.config import Settings
from nakheel.utils.text_cleaning import clean_text, normalize_arabic

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

ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
TOKEN_RE = re.compile(r"\w+", re.UNICODE)


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


def _normalized_terms(text: str) -> set[str]:
    normalized = clean_text(text).lower()
    if ARABIC_RE.search(normalized):
        normalized = normalize_arabic(normalized)
    return {term for term in TOKEN_RE.findall(normalized) if term}


def _heuristic_score(query: str, candidate: CandidateChunk) -> float:
    query_terms = _normalized_terms(query)
    chunk_terms = _normalized_terms(candidate.chunk.text)
    if not query_terms or not chunk_terms:
        return float(candidate.retrieval_score)

    overlap = len(query_terms & chunk_terms)
    overlap_ratio = overlap / max(1, len(query_terms))
    return min(1.0, overlap_ratio + float(candidate.retrieval_score))


class RerankerService:
    """Applies a precision-focused reranking step over fused candidates."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        self._loading_started = False
        self._loading_done = threading.Event()
        self._load_lock = threading.Lock()
        _quiet_third_party_output()

    def _start_background_load(self) -> None:
        """Load the heavy reranker model in the background so startup is never blocked."""

        if FlagReranker is None:
            self._loading_done.set()
            return

        with self._load_lock:
            if self._loading_started:
                return
            self._loading_started = True
            threading.Thread(target=self._load_model, name="reranker-loader", daemon=True).start()

    def _load_model(self) -> None:
        try:
            self._model = _run_quietly(
                FlagReranker,
                self.settings.BGE_RERANKER_MODEL,
                use_fp16=self.settings.BGE_USE_FP16,
            )
        except Exception:
            self._model = None
        finally:
            self._loading_done.set()

    def rerank(self, query: str, candidates: list[CandidateChunk]) -> list[ScoredChunk]:
        """Score candidates synchronously using the configured reranker or fallback."""

        if not candidates:
            return []
        if len(candidates) < self.settings.RERANKER_MIN_CANDIDATES:
            reranked = [
                ScoredChunk(chunk=item, score=_heuristic_score(query, item)) for item in candidates
            ]
            reranked.sort(key=lambda item: item.score, reverse=True)
            return reranked[: self.settings.RERANKER_TOP_K]
        self._start_background_load()
        if self._model is not None:
            pairs = [(query, item.chunk.text) for item in candidates]
            scores = _run_quietly(self._model.compute_score, pairs, normalize=True)
            if not isinstance(scores, list):
                scores = [scores]
        else:
            scores = [_heuristic_score(query, item) for item in candidates]
        reranked = [
            ScoredChunk(chunk=item, score=float(score)) for item, score in zip(candidates, scores)
        ]
        reranked.sort(key=lambda item: item.score, reverse=True)
        return reranked[: self.settings.RERANKER_TOP_K]

    async def rerank_async(self, query: str, candidates: list[CandidateChunk]) -> list[ScoredChunk]:
        """Run reranking in a worker thread to keep request handlers responsive."""

        return await asyncio.to_thread(self.rerank, query, candidates)

    def is_model_loaded(self) -> bool:
        self._start_background_load()
        return self._model is not None

    def startup_check(self) -> dict[str, str | bool]:
        self._start_background_load()
        if not self._loading_done.is_set():
            return {"ok": True, "detail": "reranker model is loading in background"}
        if self._model is None:
            return {"ok": True, "detail": "using heuristic fallback reranker"}
        try:
            score = _run_quietly(
                self._model.compute_score, [("startup check", "startup check")], normalize=True
            )
        except Exception as exc:
            return {"ok": False, "detail": f"reranker startup check failed: {exc}"}
        if isinstance(score, list):
            score = score[0]
        return {"ok": float(score) >= 0.0, "detail": "reranker model loaded"}

    async def startup_check_async(self) -> dict[str, str | bool]:
        return await asyncio.to_thread(self.startup_check)
