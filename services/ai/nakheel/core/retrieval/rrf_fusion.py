from __future__ import annotations

from typing import Any


def fuse_ranked_results(
    dense_results: list[Any],
    sparse_results: list[Any],
    k: int = 60,
    dense_weight: float = 0.7,
    sparse_weight: float = 0.3,
    top_n: int = 10,
) -> list[dict]:
    if k < 0:
        raise ValueError("k must be >= 0")
    if top_n <= 0:
        return []
    scores: dict[str, dict] = {}
    for rank, point in enumerate(dense_results, start=1):
        entry = scores.setdefault(str(point.id), {"point": point, "score": 0.0})
        entry["score"] += dense_weight * (1.0 / (k + rank))
    for rank, point in enumerate(sparse_results, start=1):
        entry = scores.setdefault(str(point.id), {"point": point, "score": 0.0})
        entry["score"] += sparse_weight * (1.0 / (k + rank))
    ranked = sorted(scores.values(), key=lambda item: item["score"], reverse=True)
    return ranked[:top_n]
