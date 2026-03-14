from datetime import UTC, datetime
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from nakheel.api.router import api_router


class FakeMongo:
    async def ping(self):
        return True


class FakeQdrant:
    def ping(self):
        return True


class FakeLLM:
    def is_available(self):
        return False

    def complete(self, messages):
        return SimpleNamespace(
            content="Grounded answer",
            prompt_tokens=10,
            completion_tokens=5,
            model="fake",
        )


class FakeIndexer:
    async def parse_only(self, filename, file_bytes):
        return {"filename": filename, "format": "markdown", "content": "# Parsed"}

    async def inject_document(self, **kwargs):
        return {"doc_id": "doc-1", "status": "indexed"}

    async def inject_raw_text(self, **kwargs):
        return {"doc_id": "doc-text-1", "status": "indexed", "filename": "copied_doc"}


class FakeSessionManager:
    def __init__(self):
        self.session = SimpleNamespace(
            session_id="sess-1",
            user_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            message_count=0,
            is_active=True,
            language="en",
        )

    async def create_session(self, user_id, language_preference, metadata):
        return self.session

    def welcome_message(self, language_preference):
        return "Hello"

    async def get_session(self, session_id):
        return self.session

    def detect_or_prefer_language(self, preferred, text):
        return "en"

    async def save_message(self, **kwargs):
        return SimpleNamespace(
            message_id="msg-1",
            created_at=datetime.now(UTC),
            retrieved_chunks=kwargs.get("retrieved_chunks", []),
        )

    async def build_context_window(self, session_id, current_user_message):
        return [{"role": "user", "content": current_user_message}]

    async def get_messages(self, session_id, page=1, per_page=20):
        return ([], 0)

    async def close_session(self, session_id):
        self.session.updated_at = datetime.now(UTC)
        return self.session


class FakeQueryProcessor:
    def process(self, query):
        return SimpleNamespace(original_text=query, normalized_text=query, language=SimpleNamespace(code="en"))


class FakeHybridSearch:
    async def search(self, processed):
        return [SimpleNamespace(chunk=SimpleNamespace(chunk_id="chk-1", doc_id="doc-1", section_title="Info", text="New Valley info"), retrieval_score=0.6)]


class FakeReranker:
    def rerank(self, query, candidates):
        return [SimpleNamespace(chunk=candidates[0], score=0.9)]


class FakePromptBuilder:
    def build_system_prompt(self, language):
        return "system"

    def build_user_prompt(self, question, context):
        return f"{context}\n{question}"


def build_test_client():
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.state.settings = SimpleNamespace(APP_VERSION="1.0.0")
    app.state.mongo = FakeMongo()
    app.state.qdrant = FakeQdrant()
    app.state.llm_client = FakeLLM()
    app.state.indexer = FakeIndexer()
    app.state.session_manager = FakeSessionManager()
    app.state.query_processor = FakeQueryProcessor()
    app.state.hybrid_search = FakeHybridSearch()
    app.state.reranker = FakeReranker()
    app.state.prompt_builder = FakePromptBuilder()
    return TestClient(app)


def test_health_endpoint():
    client = build_test_client()
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_session_endpoint():
    client = build_test_client()
    response = client.post("/api/v1/chat/sessions", json={})
    assert response.status_code == 201
    assert response.json()["session_id"] == "sess-1"


def test_send_message_endpoint():
    client = build_test_client()
    response = client.post("/api/v1/chat/sessions/sess-1/messages", json={"content": "Tell me about New Valley"})
    assert response.status_code == 200
    body = response.json()
    assert body["domain_relevant"] is True
    assert body["sources"][0]["chunk_id"] == "chk-1"


def test_inject_raw_text_endpoint():
    client = build_test_client()
    response = client.post("/api/v1/documents/inject-text", json={"content": "Copied text about New Valley"})
    assert response.status_code == 200
    assert response.json()["doc_id"] == "doc-text-1"
