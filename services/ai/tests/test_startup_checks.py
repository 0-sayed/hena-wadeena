from types import SimpleNamespace

from nakheel.config import Settings
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.ingestion.embedder import DenseEmbedder
from nakheel.core.retrieval import reranker as reranker_module
from nakheel.core.retrieval.reranker import RerankerService


def test_dense_embedder_startup_check_accepts_fallback_backend():
    embedder = DenseEmbedder(Settings(OPENAI_API_KEY=None, OPENAI_EMBEDDING_DIMENSIONS=8))

    check = embedder.startup_check()

    assert check["ok"] is True
    assert check["detail"] == "using deterministic fallback embedding backend"


def test_dense_embedder_uses_openai_embeddings(monkeypatch):
    class FakeEmbeddingsApi:
        def create(self, *, model, input, dimensions):
            return SimpleNamespace(
                data=[
                    SimpleNamespace(embedding=[float(index + 1)] * dimensions)
                    for index, _ in enumerate(input)
                ]
            )

    class FakeOpenAI:
        def __init__(self, api_key):
            self.embeddings = FakeEmbeddingsApi()

    monkeypatch.setattr("nakheel.core.ingestion.embedder.OpenAI", FakeOpenAI)
    embedder = DenseEmbedder(
        Settings(
            OPENAI_API_KEY="test-key",
            OPENAI_EMBEDDING_MODEL="text-embedding-3-small",
            OPENAI_EMBEDDING_DIMENSIONS=4,
        )
    )

    vectors = embedder.embed_texts(["first", "second"])

    assert vectors == [[1.0, 1.0, 1.0, 1.0], [2.0, 2.0, 2.0, 2.0]]


def test_reranker_startup_check_accepts_fallback_backend(monkeypatch):
    monkeypatch.setattr(reranker_module, "FlagReranker", None)
    reranker = RerankerService(Settings())

    check = reranker.startup_check()

    assert check["ok"] is True
    assert check["detail"] == "using heuristic fallback reranker"


def test_llm_startup_check_accepts_missing_api_key():
    client = LLMClient(Settings(OPENAI_API_KEY=None))

    check = client.startup_check()

    assert check["ok"] is True
    assert check["detail"] == "OPENAI_API_KEY is not configured; using fallback responses"
