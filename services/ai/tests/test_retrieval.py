from types import SimpleNamespace

from nakheel.core.generation.domain_guard import is_domain_relevant, localized_refusal
from nakheel.core.retrieval.rrf_fusion import fuse_ranked_results
from nakheel.core.retrieval.reranker import ScoredChunk


def make_point(point_id: str):
    return SimpleNamespace(id=point_id, payload={"chunk_id": point_id})


def test_rrf_fusion_deduplicates_and_orders():
    dense = [make_point("a"), make_point("b")]
    sparse = [make_point("b"), make_point("c")]
    fused = fuse_ranked_results(dense, sparse, k=60, top_n=3)
    ids = [item["point"].id for item in fused]
    assert ids[0] == "b"
    assert set(ids) == {"a", "b", "c"}


def test_domain_guard_threshold():
    chunk = SimpleNamespace(chunk=SimpleNamespace())
    assert is_domain_relevant([ScoredChunk(chunk=chunk, score=0.5)], 0.35)
    assert is_domain_relevant([ScoredChunk(chunk=chunk, score=0.35)], 0.35)
    assert not is_domain_relevant([ScoredChunk(chunk=chunk, score=0.2)], 0.35)


def test_rrf_fusion_rejects_negative_k():
    try:
        fuse_ranked_results([], [], k=-1)
    except ValueError as exc:
        assert "k must be >= 0" in str(exc)
    else:
        raise AssertionError("Expected ValueError for negative k")


def test_localized_refusal_defaults_to_english():
    assert localized_refusal("unknown").startswith("Sorry")
