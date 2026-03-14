from __future__ import annotations

import hashlib
import math

from nakheel.config import Settings

try:
    from FlagEmbedding import BGEM3FlagModel
except ImportError:  # pragma: no cover
    BGEM3FlagModel = None


class DenseEmbedder:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        if BGEM3FlagModel is not None:
            try:
                self._model = BGEM3FlagModel(
                    settings.BGE_EMBEDDING_MODEL,
                    use_fp16=settings.BGE_USE_FP16,
                    device=settings.BGE_DEVICE,
                )
            except Exception:
                self._model = None

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self._model is not None:
            result = self._model.encode(
                texts,
                batch_size=min(16, len(texts)),
                max_length=self.settings.CHUNK_MAX_TOKENS,
                return_dense=True,
                return_sparse=False,
                return_colbert_vecs=False,
            )
            return [list(vector) for vector in result["dense_vecs"]]
        return [self._fallback_dense(text) for text in texts]

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]

    def is_model_loaded(self) -> bool:
        return self._model is not None

    def startup_check(self) -> dict[str, str | bool]:
        if self._model is None:
            return {"ok": False, "detail": "BGE embedding model is not loaded"}
        sample = self.embed_query("startup health check for embeddings")
        return {"ok": bool(sample and len(sample) == 1024), "detail": "embedding model loaded"}

    @staticmethod
    def _fallback_dense(text: str, dimensions: int = 1024) -> list[float]:
        values = [0.0] * dimensions
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            values[index] += sign
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        return [v / norm for v in values]
