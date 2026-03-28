from __future__ import annotations

import asyncio
import hashlib
import math

from openai import OpenAI

from nakheel.config import Settings


class DenseEmbedder:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._dimensions = settings.OPENAI_EMBEDDING_DIMENSIONS
        self._client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self._client is not None:
            vectors: list[list[float]] = []
            for start in range(0, len(texts), 32):
                batch = texts[start : start + 32]
                response = self._client.embeddings.create(
                    model=self.settings.OPENAI_EMBEDDING_MODEL,
                    input=batch,
                    dimensions=self._dimensions,
                )
                vectors.extend([list(item.embedding) for item in response.data])
            return vectors
        return [self._fallback_dense(text, self._dimensions) for text in texts]

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]

    async def embed_texts_async(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self.embed_texts, texts)

    async def embed_query_async(self, query: str) -> list[float]:
        return await asyncio.to_thread(self.embed_query, query)

    def is_model_loaded(self) -> bool:
        return self._client is not None

    def startup_check(self) -> dict[str, str | bool]:
        if self._client is None:
            sample = self._fallback_dense("startup health check for embeddings", self._dimensions)
            return {
                "ok": bool(sample and len(sample) == self._dimensions),
                "detail": "using deterministic fallback embedding backend",
            }
        try:
            sample = self.embed_query("startup health check for embeddings")
        except Exception as exc:
            return {"ok": False, "detail": f"embedding startup check failed: {exc}"}
        return {"ok": bool(sample and len(sample) == self._dimensions), "detail": "OpenAI embedding model loaded"}

    async def startup_check_async(self) -> dict[str, str | bool]:
        return await asyncio.to_thread(self.startup_check)

    @staticmethod
    def _fallback_dense(text: str, dimensions: int) -> list[float]:
        values = [0.0] * dimensions
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            values[index] += sign
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        return [v / norm for v in values]
