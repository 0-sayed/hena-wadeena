from __future__ import annotations

import hashlib
import math
import re
from collections import Counter


TOKEN_RE = re.compile(r"\w+", re.UNICODE)


class SparseEmbedder:
    def fit_transform(self, texts: list[str]) -> list[dict[int, float]]:
        document_frequency: Counter[str] = Counter()
        tokenized_docs = []
        for text in texts:
            tokens = [token.lower() for token in TOKEN_RE.findall(text)]
            tokenized_docs.append(tokens)
            document_frequency.update(set(tokens))
        corpus_size = max(1, len(texts))
        encoded: list[dict[int, float]] = []
        for tokens in tokenized_docs:
            term_frequency = Counter(tokens)
            vector: dict[int, float] = {}
            for token, tf in term_frequency.items():
                df = document_frequency[token]
                idf = math.log((corpus_size - df + 0.5) / (df + 0.5) + 1.0)
                vector[self._token_to_index(token)] = (1 + math.log(tf)) * idf
            encoded.append(vector)
        return encoded

    def transform_query(self, text: str) -> dict[int, float]:
        term_frequency = Counter(token.lower() for token in TOKEN_RE.findall(text))
        return {self._token_to_index(token): 1 + math.log(freq) for token, freq in term_frequency.items()}

    @staticmethod
    def _token_to_index(token: str) -> int:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        return int.from_bytes(digest, "big") % (2**31 - 1)
