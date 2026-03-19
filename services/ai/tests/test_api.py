from datetime import UTC, datetime
from pathlib import Path
from tempfile import mkdtemp
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from nakheel.api.router import api_router


class FakeCursor:
    def __init__(self, items):
        self._items = list(items)

    def sort(self, *_args, **_kwargs):
        return self

    def skip(self, count):
        self._items = self._items[count:]
        return self

    def limit(self, count):
        self._items = self._items[:count]
        return self

    async def to_list(self, length):
        return self._items[:length]


class FakeCollection:
    def __init__(self, items=None):
        self.items = list(items or [])

    async def count_documents(self, filters):
        return len(self._filtered(filters))

    def find(self, filters, projection=None):
        results = []
        for item in self._filtered(filters):
            projected = dict(item)
            if projection and projection.get("_id") == 0:
                projected.pop("_id", None)
            results.append(projected)
        return FakeCursor(results)

    async def find_one(self, filters, projection=None):
        for item in self._filtered(filters):
            projected = dict(item)
            if projection and projection.get("_id") == 0:
                projected.pop("_id", None)
            return projected
        return None

    async def delete_many(self, _filters):
        return SimpleNamespace(deleted_count=0)

    async def delete_one(self, _filters):
        return SimpleNamespace(deleted_count=0)

    async def insert_one(self, _payload):
        return None

    def _filtered(self, filters):
        if not filters:
            return list(self.items)
        results = []
        for item in self.items:
            matched = True
            for key, value in filters.items():
                if isinstance(value, dict) and "$all" in value:
                    if not all(tag in item.get(key, []) for tag in value["$all"]):
                        matched = False
                        break
                elif item.get(key) != value:
                    matched = False
                    break
            if matched:
                results.append(item)
        return results


class FakeMongo:
    def __init__(self):
        self.collections = {
            "documents": FakeCollection(
                [
                    {
                        "_id": "mongo-id-1",
                        "doc_id": "doc-listed-1",
                        "batch_id": "batch-1",
                        "filename": "listed.pdf",
                        "source_type": "pdf",
                        "title": "Listed",
                        "language": "en",
                        "total_pages": 2,
                        "total_chunks": 4,
                        "file_size_kb": 12.5,
                        "uploaded_at": datetime.now(UTC),
                        "indexed_at": datetime.now(UTC),
                        "status": "indexed",
                        "tags": ["guide"],
                        "description": "Stored document",
                        "current_step": "indexed",
                        "error_detail": None,
                    }
                ]
            ),
            "audit_logs": FakeCollection(),
            "chunks": FakeCollection(),
        }

    async def ping(self):
        return True

    def collection(self, name):
        return self.collections[name]


class FakeQdrant:
    def ping(self):
        return True

    async def delete_points_async(self, point_ids):
        return None


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

    async def complete_async(self, messages):
        return self.complete(messages)


class FakeIndexer:
    def __init__(self):
        self.batches = {}
        self.parsed_root = Path(mkdtemp(prefix="nakheel-parsed-"))
        self.parsed_files = {}

    async def parse_only(self, filename, file_bytes):
        parse_id = "parsed-1"
        markdown_filename = "sample.md"
        markdown_path = self.parsed_root / markdown_filename
        markdown_path.write_text("# Parsed", encoding="utf-8")
        self.parsed_files[parse_id] = {
            "path": markdown_path,
            "markdown_filename": markdown_filename,
        }
        return {
            "parse_id": parse_id,
            "filename": filename,
            "markdown_filename": markdown_filename,
            "format": "markdown",
            "total_pages": 1,
            "word_count": 2,
            "language_detected": "en",
            "processing_time_ms": 5,
            "expires_at": datetime.now(UTC),
        }

    def resolve_parsed_markdown(self, parse_id):
        return self.parsed_files[parse_id]

    async def inject_document(self, **kwargs):
        return {"doc_id": "doc-1", "status": "indexed"}

    async def create_document_batch(self, files, title, description, tags, language_hint):
        valid_files = [file for file in files if file.filename.lower().endswith(".pdf")]
        invalid_files = [file for file in files if not file.filename.lower().endswith(".pdf")]
        batch = {
            "batch_id": "batch-1",
            "status": "pending" if valid_files else "failed",
            "total_files": len(files),
            "pending_files": len(valid_files),
            "processing_files": 0,
            "indexed_files": 0,
            "failed_files": len(invalid_files),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "completed_at": None,
            "items": [],
        }
        for index, file in enumerate(valid_files, start=1):
            batch["items"].append(
                {
                    "doc_id": f"doc-{index}",
                    "filename": file.filename,
                    "status": "pending",
                    "current_step": "queued",
                    "error_detail": None,
                    "total_pages": 0,
                    "total_chunks": 0,
                    "language": None,
                    "indexed_at": None,
                }
            )
        for index, file in enumerate(invalid_files, start=len(valid_files) + 1):
            batch["items"].append(
                {
                    "doc_id": f"doc-{index}",
                    "filename": file.filename,
                    "status": "failed",
                    "current_step": "failed",
                    "error_detail": "Only PDF files are accepted",
                    "total_pages": 0,
                    "total_chunks": 0,
                    "language": None,
                    "indexed_at": None,
                }
            )
        self.batches[batch["batch_id"]] = batch
        return batch

    async def process_document_batch(self, batch_id):
        return None

    async def get_document_batch_status(self, batch_id):
        return self.batches[batch_id]

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

    async def process_async(self, query):
        return self.process(query)


class FakeHybridSearch:
    async def search(self, processed):
        return [SimpleNamespace(chunk=SimpleNamespace(chunk_id="chk-1", doc_id="doc-1", section_title="Info", text="New Valley info"), retrieval_score=0.6)]


class FakeReranker:
    def rerank(self, query, candidates):
        return [SimpleNamespace(chunk=candidates[0], score=0.9)]

    async def rerank_async(self, query, candidates):
        return self.rerank(query, candidates)


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


def test_parse_document_returns_download_url_and_downloads_markdown():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/parse",
        files=[("file", ("sample.pdf", b"%PDF-1.4 sample", "application/pdf"))],
        data={"format": "markdown"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["parse_id"] == "parsed-1"
    assert body["download_url"].endswith("/api/v1/documents/parsed/parsed-1/download")

    download_response = client.get("/api/v1/documents/parsed/parsed-1/download")
    assert download_response.status_code == 200
    assert download_response.text == "# Parsed"


def test_inject_documents_creates_batch():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/inject",
        files=[
            ("files", ("first.pdf", b"%PDF-1.4 first", "application/pdf")),
            ("files", ("second.pdf", b"%PDF-1.4 second", "application/pdf")),
        ],
        data={"language": "auto"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["batch_id"] == "batch-1"
    assert body["total_files"] == 2
    assert body["pending_files"] == 2


def test_get_document_batch_status_endpoint():
    client = build_test_client()
    client.post(
        "/api/v1/documents/inject",
        files=[("files", ("first.pdf", b"%PDF-1.4 first", "application/pdf"))],
        data={"language": "auto"},
    )
    response = client.get("/api/v1/documents/batches/batch-1")
    assert response.status_code == 200
    body = response.json()
    assert body["batch_id"] == "batch-1"
    assert body["items"][0]["filename"] == "first.pdf"


def test_list_documents_is_objectid_safe():
    client = build_test_client()
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    body = response.json()
    assert body["documents"][0]["doc_id"] == "doc-listed-1"
    assert "_id" not in body["documents"][0]


def test_inject_documents_allows_mixed_valid_and_invalid_files():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/inject",
        files=[
            ("files", ("first.pdf", b"%PDF-1.4 first", "application/pdf")),
            ("files", ("notes.txt", b"hello", "text/plain")),
        ],
        data={"language": "auto"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["pending_files"] == 1
    assert body["failed_files"] == 1
    assert {item["current_step"] for item in body["items"]} == {"queued", "failed"}


def test_openapi_marks_document_inject_files_as_binary_uploads():
    client = build_test_client()
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()["paths"]["/api/v1/documents/inject"]["post"]["requestBody"]["content"][
        "multipart/form-data"
    ]["schema"]
    assert schema["properties"]["files"]["type"] == "array"
    assert schema["properties"]["files"]["items"]["format"] == "binary"
