from types import SimpleNamespace
from uuid import UUID

import nakheel.db.qdrant as qdrant_module
from nakheel.config import Settings
from nakheel.db.qdrant import QdrantDatabase


def test_normalize_llama_index_result_prefers_node_metadata():
    result = SimpleNamespace(
        ids=["550e8400-e29b-41d4-a716-446655440000"],
        nodes=[SimpleNamespace(node_id="node-1", metadata={"chunk_id": "chk-1", "section_title": "Intro"})],
        similarities=[0.87],
    )

    normalized = QdrantDatabase._normalize_llama_index_result(result)

    assert normalized[0].id == "550e8400-e29b-41d4-a716-446655440000"
    assert normalized[0].payload["chunk_id"] == "chk-1"
    assert normalized[0].payload["section_title"] == "Intro"
    assert normalized[0].score == 0.87


def test_normalize_llama_index_result_falls_back_to_ids():
    result = SimpleNamespace(ids=["chk-2"], nodes=[], similarities=[0.55])

    normalized = QdrantDatabase._normalize_llama_index_result(result)

    UUID(normalized[0].id)
    assert normalized[0].payload == {"chunk_id": "chk-2"}
    assert normalized[0].score == 0.55


def test_normalize_point_id_uses_uuid_suffix_for_legacy_chunk_ids():
    normalized = QdrantDatabase.normalize_point_id("chk-550e8400-e29b-41d4-a716-446655440000")

    assert normalized == "550e8400-e29b-41d4-a716-446655440000"


def test_normalize_point_id_uses_deterministic_uuid_for_non_uuid_suffix():
    normalized = QdrantDatabase.normalize_point_id("chk-2")

    assert normalized == QdrantDatabase.normalize_point_id("chk-2")
    UUID(normalized)


def test_delete_points_normalizes_legacy_chunk_ids():
    calls = []

    class FakeClient:
        def delete(self, *, collection_name, points_selector):
            calls.append((collection_name, points_selector))

    database = QdrantDatabase.__new__(QdrantDatabase)
    database.settings = SimpleNamespace(QDRANT_COLLECTION="nakheel_chunks")
    database.client = FakeClient()
    database._vector_store = None

    database.delete_points(["chk-550e8400-e29b-41d4-a716-446655440000", "chk-2"])

    assert calls[0][0] == "nakheel_chunks"
    assert calls[0][1][0] == "550e8400-e29b-41d4-a716-446655440000"
    UUID(calls[0][1][1])


def test_llama_index_backend_is_disabled_for_non_llama_vector_names(monkeypatch):
    calls = {"constructed": 0}

    class FakeVectorStore:
        def __init__(self, **_kwargs):
            calls["constructed"] += 1

    class FakeClient:
        def get_collection(self, _collection_name):
            return SimpleNamespace(
                config=SimpleNamespace(
                    params=SimpleNamespace(
                        vectors={"dense": object()},
                    )
                )
            )

    monkeypatch.setattr(qdrant_module, "QdrantVectorStore", FakeVectorStore)
    database = QdrantDatabase(Settings())
    database.client = FakeClient()

    assert database.llama_index_backend_available() is False
    assert calls["constructed"] == 0
