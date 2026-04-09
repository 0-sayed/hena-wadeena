import json
from datetime import UTC, datetime
from pathlib import Path
from tempfile import mkdtemp
from types import SimpleNamespace

import jwt
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from nakheel.api.router import api_router

JWT_SECRET = "test-jwt-secret"
JWT_ALGO = "HS256"


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

    async def update_one(self, _filters, _update):
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
            "sessions": FakeCollection(),
            "messages": FakeCollection(),
        }

    async def ping(self):
        return True

    def collection(self, name):
        return self.collections[name]


class FakeQdrant:
    def ping(self):
        return True

    async def delete_points_async(self, _point_ids):
        return None


class FakeLLM:
    def is_available(self):
        return False

    def complete(self, _messages):
        return SimpleNamespace(
            content="Grounded answer",
            prompt_tokens=10,
            completion_tokens=5,
            model="fake",
        )

    async def complete_async(self, messages):
        return self.complete(messages)

    async def stream_async(self, messages):
        response = self.complete(messages)
        yield SimpleNamespace(type="token", delta="Grounded ")
        yield SimpleNamespace(type="token", delta="answer")
        yield SimpleNamespace(type="done", response=response)


class FakeIndexer:
    def __init__(self):
        self.batches = {}
        self.parsed_root = Path(mkdtemp(prefix="nakheel-parsed-"))
        self.parsed_files = {}
        self.curated_entries = []

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

    async def create_document_batch(
        self, files, title=None, description=None, tags=None, language_hint="auto"
    ):
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

    async def process_document_batch(self, _batch_id):
        return None

    async def get_document_batch_status(self, batch_id):
        return self.batches[batch_id]

    async def inject_raw_text(self, **_kwargs):
        return {"doc_id": "doc-text-1", "status": "indexed", "filename": "copied_doc"}

    async def inject_curated_text(self, **kwargs):
        self.curated_entries.append(kwargs)
        return {
            "doc_id": f"doc-curated-{len(self.curated_entries)}",
            "status": "indexed",
            "filename": f"{kwargs['slug']}.md",
            "indexed_at": datetime.now(UTC),
            "total_chunks": 1,
            "slug": kwargs["slug"],
        }


class FakeSessionManager:
    def __init__(self):
        self.session = SimpleNamespace(
            session_id="sess-1",
            user_id="user-1",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            message_count=0,
            is_active=True,
            language="en",
        )
        self.force_new_history: list[bool] = []

    async def get_or_create_active_session(self, user_id, language_preference, metadata, force_new):
        self.force_new_history.append(force_new)
        if force_new:
            self.session = SimpleNamespace(
                session_id="sess-2",
                user_id=user_id,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                message_count=0,
                is_active=True,
                language=language_preference if language_preference != "auto" else "en",
            )
            return self.session
        self.session.user_id = user_id
        return self.session

    def welcome_message(self, _language_preference):
        return "Hello"

    async def get_session(self, session_id, user_id):
        if user_id != self.session.user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if session_id != self.session.session_id:
            raise HTTPException(status_code=404, detail="Not found")
        return self.session

    def detect_or_prefer_language(self, preferred, _text):
        return "en" if preferred == "auto" else preferred

    async def save_message(self, **kwargs):
        self.session.updated_at = datetime.now(UTC)
        self.session.message_count += 1
        return SimpleNamespace(
            message_id="msg-1",
            created_at=datetime.now(UTC),
            retrieved_chunks=kwargs.get("retrieved_chunks", []),
        )

    async def build_context_window(
        self, _session_id, current_user_message, exclude_message_id=None
    ):
        return [{"role": "user", "content": current_user_message}]

    async def get_messages(self, _session_id, page=1, per_page=20):
        return ([], 0)

    async def close_session(self, session_id, user_id):
        await self.get_session(session_id, user_id)
        self.session.updated_at = datetime.now(UTC)
        self.session.is_active = False
        return self.session


class FakeQueryProcessor:
    def process(self, query):
        return SimpleNamespace(
            original_text=query,
            normalized_text=query,
            language=SimpleNamespace(code="en"),
        )

    async def process_async(self, query):
        return self.process(query)


class FakeHybridSearch:
    async def search(self, _processed):
        return [
            SimpleNamespace(
                chunk=SimpleNamespace(
                    chunk_id="chk-1",
                    doc_id="doc-1",
                    section_title="Info",
                    text="New Valley info",
                ),
                retrieval_score=0.6,
            )
        ]


class FakeReranker:
    def rerank(self, _query, candidates):
        return [SimpleNamespace(chunk=candidates[0], score=0.9)]

    async def rerank_async(self, query, candidates):
        return self.rerank(query, candidates)


class FakePromptBuilder:
    def build_system_prompt(self, _language):
        return "system"

    def build_user_prompt(self, question, context):
        return f"{context}\n{question}"


def _auth_headers(user_id: str = "user-1", role: str = "tourist") -> dict[str, str]:
    token = jwt.encode(
        {"sub": user_id, "email": f"{user_id}@example.com", "role": role},
        JWT_SECRET,
        algorithm=JWT_ALGO,
    )
    return {"Authorization": f"Bearer {token}"}


def build_test_client() -> TestClient:
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.state.settings = SimpleNamespace(
        APP_VERSION="1.0.0",
        JWT_ACCESS_SECRET=JWT_SECRET,
        JWT_ALGORITHM=JWT_ALGO,
        RELEVANCE_THRESHOLD=0.35,
    )
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


def test_chat_requires_jwt():
    client = build_test_client()
    response = client.post("/api/v1/chat/sessions", json={})
    assert response.status_code == 401


def test_documents_require_jwt():
    client = build_test_client()
    response = client.get("/api/v1/documents")
    assert response.status_code == 401


def test_documents_require_admin_role():
    client = build_test_client()
    response = client.get("/api/v1/documents", headers=_auth_headers(role="tourist"))
    assert response.status_code == 403


def test_create_session_endpoint_and_force_new():
    client = build_test_client()

    first = client.post("/api/v1/chat/sessions", json={}, headers=_auth_headers())
    assert first.status_code == 201
    assert first.json()["session_id"] == "sess-1"

    rotated = client.post("/api/v1/chat/sessions?force_new=true", json={}, headers=_auth_headers())
    assert rotated.status_code == 201
    assert rotated.json()["session_id"] == "sess-2"


def test_send_message_endpoint():
    client = build_test_client()
    response = client.post(
        "/api/v1/chat/sessions/sess-1/messages",
        json={"content": "Tell me about New Valley"},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["domain_relevant"] is True
    assert body["sources"][0]["chunk_id"] == "chk-1"


def test_send_message_stream_endpoint():
    client = build_test_client()
    response = client.post(
        "/api/v1/chat/sessions/sess-1/messages/stream",
        json={"content": "Tell me about New Valley"},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/x-ndjson")

    events = [json.loads(line) for line in response.text.strip().splitlines()]
    assert events[0] == {
        "type": "status",
        "phase": "accepted",
        "message": "Preparing your answer.",
    }
    assert [event["phase"] for event in events if event["type"] == "status"] == [
        "accepted",
        "processing_query",
        "retrieving_context",
        "reranking_context",
        "generating_answer",
    ]
    token_events = [event for event in events if event["type"] == "token"]
    assert token_events[0] == {"type": "token", "delta": "Grounded "}
    assert token_events[1] == {"type": "token", "delta": "answer"}
    assert events[-1]["type"] == "complete"
    assert events[-1]["message"]["content"] == "Grounded answer"
    assert events[-1]["message"]["domain_relevant"] is True


def test_session_owner_enforcement_blocks_other_users():
    client = build_test_client()
    response = client.post(
        "/api/v1/chat/sessions/sess-1/messages",
        json={"content": "Hello"},
        headers=_auth_headers("user-2"),
    )
    assert response.status_code == 403


def test_legacy_ai_chat_shim_returns_compat_shape():
    client = build_test_client()
    response = client.post(
        "/api/v1/ai/chat",
        json={"message": "Tell me about New Valley"},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["conversation_id"] in {"sess-1", "sess-2"}
    assert isinstance(body["data"]["sources"], list)


def test_inject_raw_text_endpoint():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/inject-text",
        json={"content": "Copied text about New Valley"},
        headers=_auth_headers(role="admin"),
    )
    assert response.status_code == 200
    assert response.json()["doc_id"] == "doc-text-1"


def test_compose_curated_text_endpoint_uses_fallback_sections():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/curated/compose",
        json={
            "text": "Intro about New Valley.\n\nGeography and administration\n\nThe governorate spans a wide desert area.",
            "language": "ar",
        },
        headers=_auth_headers(role="admin"),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["strategy"] == "fallback"
    assert len(body["entries"]) >= 1
    assert body["entries"][0]["slug"]


def test_feed_curated_text_endpoint():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/curated/feed",
        json={
            "entries": [
                {
                    "slug": "geography",
                    "title": "Geography",
                    "description": "Governorate geography",
                    "content": "The governorate spans a wide desert area.",
                    "tags": ["geography"],
                    "language": "ar",
                }
            ]
        },
        headers=_auth_headers(role="admin"),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["indexed_entries"] == 1
    assert body["failed_entries"] == 0
    assert body["items"][0]["filename"] == "geography.md"


def test_parse_document_returns_download_url_and_downloads_markdown():
    client = build_test_client()
    response = client.post(
        "/api/v1/documents/parse",
        files=[("file", ("sample.pdf", b"%PDF-1.4 sample", "application/pdf"))],
        data={"format": "markdown"},
        headers=_auth_headers(role="admin"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["parse_id"] == "parsed-1"
    assert body["download_url"].endswith("/api/v1/documents/parsed/parsed-1/download")

    download_response = client.get(
        "/api/v1/documents/parsed/parsed-1/download",
        headers=_auth_headers(role="admin"),
    )
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
        headers=_auth_headers(role="admin"),
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
        headers=_auth_headers(role="admin"),
    )
    response = client.get("/api/v1/documents/batches/batch-1", headers=_auth_headers(role="admin"))
    assert response.status_code == 200
    body = response.json()
    assert body["batch_id"] == "batch-1"
    assert body["items"][0]["filename"] == "first.pdf"


def test_list_documents_is_objectid_safe():
    client = build_test_client()
    response = client.get("/api/v1/documents", headers=_auth_headers(role="admin"))
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
        headers=_auth_headers(role="admin"),
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
