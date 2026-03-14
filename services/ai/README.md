# Nakheel RAG MVP

FastAPI implementation of the Nakheel bilingual RAG chatbot for New Valley Governorate.

## What is included

- Synchronous PDF parse and inject endpoints
- Hybrid retrieval with dense + sparse search abstractions
- Domain-guarded chat sessions with source references
- MongoDB persistence for documents, chunks, sessions, messages, and audit logs
- Qdrant collection bootstrap for dense and sparse vectors
- Health endpoint and RFC 7807-style errors
- Unit and API tests for the MVP behaviors

## Docker setup

1. Create `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

2. Add your `OPENAI_API_KEY` in `.env`.

3. Start the full stack:

```powershell
./run.ps1
```

Or directly:

```powershell
docker compose up --build
```

Services:

- API: `http://localhost:8000`
- MongoDB: `mongodb://localhost:27017`
- Qdrant: `http://localhost:6333`

Stop everything:

```powershell
docker compose down
```

Stop and remove volumes:

```powershell
docker compose down -v
```

## Local setup without Docker

1. Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Start Qdrant locally:

```powershell
docker run -p 6333:6333 qdrant/qdrant
```

3. Start MongoDB locally or point to MongoDB Atlas.

4. Create `.env` from `.env.example` and fill in:

- `MONGODB_URI`
- `OPENAI_API_KEY`
- `QDRANT_*`

5. Run the API:

```powershell
uvicorn main:app --reload --port 8000
```

## Notes on heavy dependencies

- `docling` is the preferred parser; a lightweight PDF-text fallback is included for local development.
- `FlagEmbedding` is the preferred embedding/reranking stack; deterministic fallbacks are included so tests can run without downloading large model weights.
- For production-like quality, install the full dependencies and allow model downloads before evaluating answer quality.

## Smoke test

Create a session:

```powershell
curl -Method Post http://localhost:8000/api/v1/chat/sessions -ContentType "application/json" -Body "{}"
```

Health check:

```powershell
curl http://localhost:8000/api/v1/health
```

Parse a PDF:

```powershell
curl -Method Post http://localhost:8000/api/v1/documents/parse -Form @{ file = Get-Item .\sample.pdf }
```

## Test

```powershell
pytest
```
