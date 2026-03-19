# Nakheel RAG MVP

FastAPI implementation of the Nakheel bilingual RAG chatbot for New Valley Governorate.

## What is included

- Synchronous PDF parse plus asynchronous batch PDF inject endpoints
- Hybrid retrieval with dense + sparse search abstractions
- Domain-guarded chat sessions with source references
- MongoDB persistence for documents, chunks, sessions, messages, and audit logs
- Qdrant collection bootstrap for dense and sparse vectors
- Health endpoint and RFC 7807-style errors
- Unit and API tests for the MVP behaviors

## Docker setup

1. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

2. Set `OPENAI_API_KEY` and replace `APP_SECRET_KEY` in `.env`.

3. Start MongoDB locally on your machine.

4. Start the Docker stack for the API and Qdrant:

```bash
docker compose up --build
```

Services:

- API: `http://localhost:7000`
- MongoDB: `mongodb://127.0.0.1:27017`
- Qdrant: `http://localhost:6333`

Stop everything:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

## Local setup without Docker

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

2. Start Qdrant locally:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

3. Start MongoDB locally or point to MongoDB Atlas.

4. Create `.env` from `.env.example` and fill in:

- `MONGODB_URI`
- `OPENAI_API_KEY`
- `QDRANT_*`

5. Run the API:

```powershell
uvicorn main:app --reload --port 7000
```

## Notes on heavy dependencies

- Dense retrieval uses OpenAI embeddings through the API, with a deterministic local fallback when no API key is configured.
- The PDF parser defaults to `pypdf` for a lighter and quieter ingest path; switch `PDF_PARSER_BACKEND=docling` only if you need richer extraction.
- `FlagEmbedding` is only used for reranking. If it is unavailable, the app falls back to the built-in heuristic reranker.

## Smoke test

Create a session:

```bash
curl -X POST http://localhost:7000/api/v1/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{}'
```

Health check:

```bash
curl http://localhost:7000/api/v1/health
```

Parse a PDF:

```bash
curl -X POST http://localhost:7000/api/v1/documents/parse \
  -F "file=@./sample.pdf"
```

Submit a PDF batch:

```bash
curl -X POST http://localhost:7000/api/v1/documents/inject \
  -F "files=@./sample.pdf"
```

Check batch status:

```powershell
curl http://localhost:7000/api/v1/documents/batches/<batch_id>
```

## Test

```bash
pytest
```
