import asyncio
from types import SimpleNamespace

from nakheel.config import Settings
from nakheel.core.generation.domain_guard import is_domain_relevant, localized_refusal
from nakheel.core.retrieval.hybrid_search import HybridSearchService
from nakheel.core.retrieval.query_processor import QueryProcessor, ProcessedQuery
from nakheel.core.retrieval.rrf_fusion import fuse_ranked_results
from nakheel.core.retrieval.reranker import RerankerService, ScoredChunk


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


def test_reranker_skips_neural_scoring_for_small_candidate_sets():
    settings = Settings(RERANKER_TOP_K=2, RERANKER_MIN_CANDIDATES=4)
    reranker = RerankerService(settings)
    candidates = [
        SimpleNamespace(chunk=SimpleNamespace(text="معلومات عامة"), retrieval_score=0.017),
        SimpleNamespace(
            chunk=SimpleNamespace(text="محافظة الوادي الجديد من أكبر محافظات مصر"),
            retrieval_score=0.016,
        ),
        SimpleNamespace(
            chunk=SimpleNamespace(text="الزراعة في الوادي الجديد تعتمد على المياه الجوفية"),
            retrieval_score=0.015,
        ),
    ]

    reranked = reranker.rerank("محافظة الوادي الجديد", candidates)

    assert [item.chunk.chunk.text for item in reranked] == [
        "محافظة الوادي الجديد من أكبر محافظات مصر",
        "الزراعة في الوادي الجديد تعتمد على المياه الجوفية",
    ]
    assert reranked[0].score > 0.35
    assert reranked[1].score > 0.35
    assert is_domain_relevant(reranked, 0.35)


def test_reranker_skip_keeps_out_of_domain_queries_below_threshold():
    settings = Settings(RERANKER_TOP_K=2, RERANKER_MIN_CANDIDATES=4)
    reranker = RerankerService(settings)
    candidates = [
        SimpleNamespace(
            chunk=SimpleNamespace(text="محافظة الوادي الجديد من أكبر محافظات مصر"),
            retrieval_score=0.016,
        ),
        SimpleNamespace(
            chunk=SimpleNamespace(text="الزراعة في الوادي الجديد تعتمد على المياه الجوفية"),
            retrieval_score=0.015,
        ),
    ]

    reranked = reranker.rerank("كرة القدم الأوروبية", candidates)

    assert reranked[0].score < 0.35
    assert not is_domain_relevant(reranked, 0.35)


def test_hybrid_search_uses_qdrant_payload_without_mongo_roundtrip():
    settings = Settings(DENSE_TOP_K=2, SPARSE_TOP_K=2, RRF_TOP_N=2)

    class FakeQdrant:
        async def dense_search_async(self, _vector, _limit):
            return [
                SimpleNamespace(
                    id="point-1",
                    payload={
                        "chunk_id": "chk-1",
                        "doc_id": "doc-1",
                        "chunk_index": 0,
                        "section_title": "Intro",
                        "parent_section": None,
                        "text": "New Valley overview",
                        "language": "en",
                        "page_numbers": [1],
                        "token_count": 3,
                    },
                    score=0.8,
                )
            ]

        async def sparse_search_async(self, _vector, _limit):
            return []

    class FakeMongo:
        def collection(self, _name):
            raise AssertionError("Mongo should not be queried when Qdrant payload is complete")

    service = HybridSearchService(settings, FakeQdrant(), FakeMongo())
    query = ProcessedQuery(
        original_text="New Valley",
        normalized_text="New Valley",
        dense_vector=[0.1],
        sparse_vector={1: 0.2},
        language=SimpleNamespace(code="en"),
    )

    results = asyncio.run(service.search(query))

    assert len(results) == 1
    assert results[0].chunk.chunk_id == "chk-1"
    assert results[0].chunk.text == "New Valley overview"


def test_query_processor_caches_repeated_queries():
    calls = {"dense": 0, "sparse": 0}

    class FakeDenseEmbedder:
        settings = SimpleNamespace(QUERY_CACHE_SIZE=16)

        async def embed_query_async(self, query: str):
            calls["dense"] += 1
            return [float(len(query))]

        def embed_query(self, query: str):
            calls["dense"] += 1
            return [float(len(query))]

    class FakeSparseEmbedder:
        def transform_query(self, query: str):
            calls["sparse"] += 1
            return {len(query): 1.0}

    processor = QueryProcessor(FakeDenseEmbedder(), FakeSparseEmbedder())

    first = asyncio.run(processor.process_async(" New Valley "))
    second = asyncio.run(processor.process_async("New Valley"))

    assert first.normalized_text == second.normalized_text
    assert calls == {"dense": 1, "sparse": 1}
