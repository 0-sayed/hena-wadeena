# AI Service (Nakheel RAG Chatbot)

Retrieval-Augmented Generation (RAG) chatbot service for New Valley Governorate platform. Provides AI-powered question answering with support for Egyptian Arabic dialects, leveraging a hybrid search architecture combining dense and sparse vector retrieval.

## Overview

**Nakheel** (نخيل, "Palm Trees") is the AI assistant for the Hena Wadeena platform, designed to answer questions about New Valley Governorate's tourism, culture, history, and services. The service:

- Understands Egyptian Arabic (colloquial) and Modern Standard Arabic (MSA)
- Retrieves relevant context from an indexed knowledge base
- Generates responses grounded in retrieved documents
- Maintains conversation sessions with context awareness
- Blocks out-of-domain queries to ensure accurate, relevant responses

## Features

- **Egyptian Arabic Support**: Detects and normalizes Egyptian colloquial Arabic (ايه، فين، عايز, etc.)
- **Hybrid Search**: Combines dense embeddings and sparse (BM25) retrieval with Reciprocal Rank Fusion (RRF)
- **Neural Reranking**: Uses BGE reranker v2-m3 to refine retrieval results
- **Session Management**: Maintains conversational context with sliding window history
- **Document Ingestion**: Parses PDFs with optional OCR and table extraction
- **Domain Guard**: Rejects off-topic queries with localized refusal messages

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI 0.115+ |
| Language | Python 3.12 |
| Package Manager | `uv` (ultra-fast Python package manager) |
| Vector Database | Qdrant 1.16+ |
| Document Store | MongoDB 7+ (Motor async driver) |
| LLM | OpenAI API (gpt-4o-mini) |
| Embeddings | OpenAI text-embedding-3-small (1024 dims) |
| Reranker | BAAI/bge-reranker-v2-m3 (FlagEmbedding) |
| PDF Parsing | Docling + PyPDF |
| Logging | Loguru |

## Prerequisites

- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) package manager
- Qdrant vector database (via Docker or cloud)
- MongoDB 7+ (via Docker or cloud)
- OpenAI API key (for LLM and embeddings)

## Getting Started

### 1. Install Dependencies

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Sync dependencies (creates virtual environment automatically)
cd services/ai
uv sync
```

### 2. Configure Environment

Create a `.env` file in `services/ai/`:

```bash
# Application
APP_NAME="Nakheel RAG Chatbot"
APP_ENV=development
APP_PORT=8005
APP_VERSION=1.0.0
API_V1_PREFIX=/api/v1
LOG_LEVEL=INFO

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=nakheel_db

# Qdrant Vector Database
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=nakheel_chunks
QDRANT_USE_HTTPS=false
# QDRANT_API_KEY=your-key-here  # For Qdrant Cloud

# OpenAI API
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1024
OPENAI_MAX_TOKENS=768
OPENAI_TEMPERATURE=0.3
OPENAI_TIMEOUT_SECONDS=60

# JWT Authentication (shared with identity service)
JWT_ACCESS_SECRET=your-shared-jwt-secret
JWT_ALGORITHM=HS256

# BGE Reranker
BGE_RERANKER_MODEL=BAAI/bge-reranker-v2-m3
BGE_USE_FP16=false  # Set true for GPU acceleration

# PDF Parsing
PDF_PARSER_BACKEND=pypdf  # Options: pypdf, docling
PDF_ENABLE_OCR=false
PDF_ENABLE_TABLE_STRUCTURE=false

# Chunking
CHUNK_MAX_TOKENS=512
CHUNK_MIN_TOKENS=50
CHUNK_OVERLAP_RATIO=0.20

# Retrieval
DENSE_TOP_K=20
SPARSE_TOP_K=20
RRF_K=60
RRF_TOP_N=10
RERANKER_TOP_K=5
RELEVANCE_THRESHOLD=0.35
DENSE_WEIGHT=0.7
SPARSE_WEIGHT=0.3

# Session Management
SESSION_MAX_MESSAGES=10
SESSION_TTL_HOURS=168  # 7 days
TOKEN_BUDGET_HISTORY=2000
TOKEN_BUDGET_CONTEXT=1600

# File Upload
MAX_FILE_SIZE_MB=50
TEMP_DIR=./tmp/nakheel
PARSED_FILE_TTL_HOURS=2

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=30
RATE_LIMIT_INJECT_PER_HOUR=10
```

### 3. Start Infrastructure

From the project root:

```bash
# Start Qdrant and MongoDB
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d qdrant mongodb
```

### 4. Run the Service

```bash
# Development mode (auto-reload)
cd services/ai
uv run uvicorn nakheel.main:app --reload --port 8005

# Production mode
uv run uvicorn nakheel.main:app --host 0.0.0.0 --port 8005 --workers 4
```

The service will be available at `http://localhost:8005`.

## Project Structure

```
services/ai/
├── nakheel/                    # Main application package
│   ├── api/                    # FastAPI routes and dependencies
│   │   ├── endpoints/
│   │   │   ├── chat.py         # Chat session and message endpoints
│   │   │   ├── documents.py    # Document upload/management
│   │   │   ├── health.py       # Health checks and diagnostics
│   │   │   └── legacy_ai.py    # Backward-compatible API
│   │   ├── deps.py             # Dependency injection
│   │   └── router.py           # API router aggregation
│   ├── core/                   # Business logic
│   │   ├── generation/         # LLM and prompt engineering
│   │   │   ├── context_builder.py     # RAG context assembly
│   │   │   ├── domain_guard.py        # Off-topic detection
│   │   │   ├── llm_client.py          # OpenAI client wrapper
│   │   │   └── prompt_builder.py      # Prompt templates
│   │   ├── ingestion/          # Document processing pipeline
│   │   │   ├── chunker.py      # Token-aware text chunking
│   │   │   ├── embedder.py     # Dense embedding (OpenAI)
│   │   │   ├── indexer.py      # Document indexing orchestrator
│   │   │   ├── parser.py       # PDF/document parsing
│   │   │   └── sparse_embedder.py     # BM25 sparse vectors
│   │   ├── retrieval/          # Search and ranking
│   │   │   ├── hybrid_search.py       # Dense + sparse fusion
│   │   │   ├── query_processor.py     # Query embedding
│   │   │   ├── reranker.py            # BGE neural reranker
│   │   │   └── rrf_fusion.py          # Reciprocal Rank Fusion
│   │   └── session/            # Conversation management
│   │       ├── context_window.py      # Token budget tracking
│   │       └── session_manager.py     # Session CRUD
│   ├── db/                     # Database clients
│   │   ├── mongo.py            # MongoDB async client
│   │   └── qdrant.py           # Qdrant vector store
│   ├── models/                 # Pydantic models
│   │   ├── api.py              # API request/response schemas
│   │   ├── chunk.py            # Text chunk model
│   │   ├── document.py         # Document metadata
│   │   ├── message.py          # Chat message model
│   │   └── session.py          # Session model
│   ├── utils/                  # Utilities
│   │   ├── ids.py              # ID generation
│   │   ├── language.py         # Egyptian Arabic detection
│   │   ├── text_cleaning.py   # Arabic normalization
│   │   └── token_counter.py   # Token estimation
│   ├── config.py               # Pydantic settings
│   ├── exceptions.py           # Custom exceptions
│   └── main.py                 # FastAPI app entrypoint
├── scripts/
│   └── seed_knowledge_base.py  # Seed data ingestion script
├── tests/                      # Pytest test suite
├── src/
│   └── main.py                 # Compatibility entrypoint
├── main.py                     # Root entrypoint (imports nakheel.main)
├── pyproject.toml              # uv project config
└── README.md                   # This file
```

## RAG Architecture

### 1. Document Ingestion Pipeline

```
PDF/Document → Parser → Chunker → Embedder → Qdrant (vectors) + MongoDB (metadata)
                                       ↓
                                Sparse Embedder (BM25)
```

- **Parser**: Extracts text from PDFs using Docling or PyPDF
- **Chunker**: Splits text into overlapping chunks (512 tokens max, 20% overlap)
- **Dense Embedder**: Generates OpenAI embeddings (1024 dims)
- **Sparse Embedder**: Generates BM25-style sparse vectors for keyword matching
- **Storage**: Vectors in Qdrant, full chunks and metadata in MongoDB

### 2. Query Processing

```
User Query → Language Detection → Arabic Normalization → Dense + Sparse Embedding
```

- Detects Egyptian Arabic markers (ايه، فين، etc.)
- Normalizes Arabic text (removes diacritics, normalizes Alef/Yaa variants)
- Generates both dense and sparse query vectors

### 3. Hybrid Search & Reranking

```
Query Vectors → Qdrant (dense + sparse) → RRF Fusion → BGE Reranker → Top K Chunks
```

- **Dense Search**: Semantic similarity search in Qdrant (top 20)
- **Sparse Search**: Keyword-based search in Qdrant (top 20)
- **RRF Fusion**: Merges rankings with weights (70% dense, 30% sparse)
- **Reranker**: BGE model rescores top 10 candidates → returns top 5

### 4. Response Generation

```
Retrieved Chunks + Session History + User Query → Prompt Builder → LLM → Response
```

- Builds context from retrieved chunks (respects token budget)
- Includes recent conversation history (up to 10 messages, 2000 token budget)
- Guards against off-topic queries (rejects with localized message)
- Post-processes response to ensure consistency

## API Endpoints

### Health

- `GET /health` - Container health check
- `GET /api/v1/health/ready` - Startup dependency validation

### Chat

- `POST /api/v1/chat/sessions` - Create new session
- `POST /api/v1/chat/sessions/{session_id}/message` - Send message
- `GET /api/v1/chat/sessions/{session_id}` - Get session details
- `DELETE /api/v1/chat/sessions/{session_id}` - Delete session

### Documents (Admin)

- `POST /api/v1/documents/upload` - Upload and index PDF
- `POST /api/v1/documents/batch` - Batch upload from URLs
- `GET /api/v1/documents` - List indexed documents
- `GET /api/v1/documents/{doc_id}` - Get document details
- `DELETE /api/v1/documents/{doc_id}` - Delete document and chunks

### Interactive API Docs

- Swagger UI: `http://localhost:8005/api/v1/ai/docs`
- OpenAPI JSON: `http://localhost:8005/api/v1/ai/openapi.json`

## Vector Database (Qdrant)

### Collection Schema

```python
Collection: nakheel_chunks
  - Vectors:
      * dense: 1024 dimensions (OpenAI embeddings)
      * sparse: named sparse vector (BM25-style)
  - Payload:
      * chunk_id: str
      * doc_id: str
      * section_title: str (optional)
```

### Creating the Collection

The service auto-creates the Qdrant collection on startup. To manually create it:

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(host="localhost", port=6333)

client.create_collection(
    collection_name="nakheel_chunks",
    vectors_config={
        "dense": models.VectorParams(
            size=1024,
            distance=models.Distance.COSINE,
        )
    },
    sparse_vectors_config={
        "sparse": models.SparseVectorParams(
            index=models.SparseIndexParams()
        )
    },
)
```

## MongoDB Configuration

### Database: `nakheel_db`

### Collections

- **documents**: Document metadata (title, author, source URL, upload timestamp, status)
- **chunks**: Text chunks with metadata (chunk_id, doc_id, text, section_title, token_count)
- **sessions**: Conversation sessions (session_id, user_id, created_at, updated_at, ttl)
- **messages**: Chat messages (message_id, session_id, role, content, sources, timestamp)

### Indexes

Auto-created on startup:

```javascript
// sessions collection
{ user_id: 1, updated_at: -1 }
{ updated_at: 1 } expireAfterSeconds: SESSION_TTL_HOURS * 3600

// messages collection
{ session_id: 1, timestamp: 1 }

// documents collection
{ status: 1, uploaded_at: -1 }

// chunks collection
{ doc_id: 1 }
{ chunk_id: 1 } unique
```

## Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=nakheel --cov-report=html

# Run specific test file
uv run pytest tests/test_retrieval.py -v

# Run tests matching pattern
uv run pytest -k "test_chunker"
```

### Test Structure

- `tests/test_api.py` - FastAPI endpoint tests
- `tests/test_chunker.py` - Text chunking logic
- `tests/test_health.py` - Health check endpoints
- `tests/test_indexer.py` - Document indexing pipeline
- `tests/test_qdrant_backend.py` - Qdrant operations
- `tests/test_retrieval.py` - Hybrid search and reranking
- `tests/test_session.py` - Session management
- `tests/test_startup_checks.py` - Dependency validation

## Model Configuration

### LLM (OpenAI)

**Model**: `gpt-4o-mini`

- Max tokens: 768 (configurable via `OPENAI_MAX_TOKENS`)
- Temperature: 0.3 (low randomness for factual responses)
- Timeout: 60 seconds (configurable via `OPENAI_TIMEOUT_SECONDS`)
- Fallback: Returns generic message if API key not configured

### Embeddings (OpenAI)

**Model**: `text-embedding-3-small`

- Dimensions: 1024 (configurable via `OPENAI_EMBEDDING_DIMENSIONS`)
- Batch size: 32 texts per API call
- Fallback: Deterministic hash-based vectors if API key not configured

### Reranker (Local)

**Model**: `BAAI/bge-reranker-v2-m3`

- Input: Query + candidate chunk pairs
- Output: Relevance scores (0-1)
- Device: CPU by default (set `BGE_USE_FP16=true` for GPU)
- First call downloads ~2GB model from HuggingFace

## Egyptian Arabic Support

### Detection

The service detects Egyptian Arabic using:

1. Script analysis (Arabic vs Latin characters)
2. Colloquial markers: ايه، ازاي، فين، عايز، عاوزه، ممكن، لسه، بتاع، دي، ده
3. Fallback to `langdetect` library for other languages

### Normalization

Applied before embedding and search:

- Remove Arabic diacritics (harakat)
- Normalize Alef variants (أ، إ، آ → ا)
- Normalize Yaa variants (ى → ي)
- Normalize Taa Marbuta (ة → ه)
- Preserve Egyptian spelling patterns

### Example

```python
Input:  "فين أحسن مطاعم فى الواحات الخارجة؟"
Detected: ar-eg (confidence: 0.92)
Normalized: "فين احسن مطاعم في الواحات الخارجه"
```

## Seeding Knowledge Base

Use the provided script to bulk-index documents:

```bash
# From services/ai directory
uv run python scripts/seed_knowledge_base.py \
  --source-dir /path/to/pdfs \
  --mongodb-uri mongodb://localhost:27017 \
  --qdrant-host localhost
```

See `scripts/seed_knowledge_base.py` for advanced options (batch size, file filters, etc.).

## Performance Tuning

### Retrieval Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `DENSE_TOP_K` | 20 | Dense search recall |
| `SPARSE_TOP_K` | 20 | Sparse search recall |
| `RRF_TOP_N` | 10 | Post-fusion candidates |
| `RERANKER_TOP_K` | 5 | Final context chunks |
| `RELEVANCE_THRESHOLD` | 0.35 | Min reranker score |
| `DENSE_WEIGHT` | 0.7 | Dense priority (semantic) |
| `SPARSE_WEIGHT` | 0.3 | Sparse priority (keywords) |

**Tuning Tips**:
- Increase `DENSE_WEIGHT` for conceptual queries
- Increase `SPARSE_WEIGHT` for keyword-heavy queries
- Lower `RELEVANCE_THRESHOLD` if results are too sparse

### Chunking Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `CHUNK_MAX_TOKENS` | 512 | Max chunk size |
| `CHUNK_MIN_TOKENS` | 50 | Min chunk size |
| `CHUNK_OVERLAP_RATIO` | 0.20 | Overlap between chunks |

**Tuning Tips**:
- Larger chunks: better context, fewer results
- Smaller chunks: more precise retrieval
- Higher overlap: smoother transitions, more storage

## Troubleshooting

### Qdrant Connection Fails

```bash
# Check Qdrant is running
docker ps | grep qdrant

# Test connection
curl http://localhost:6333/collections
```

### MongoDB Connection Fails

```bash
# Check MongoDB is running
docker ps | grep mongo

# Test connection
mongosh mongodb://localhost:27017
```

### BGE Reranker Out of Memory

Set `BGE_USE_FP16=false` or reduce `RERANKER_TOP_K`.

### OpenAI API Rate Limits

Reduce `DENSE_TOP_K` and `SPARSE_TOP_K` to minimize embedding calls.

## Development

### Code Quality

```bash
# Format code
uv run ruff format .

# Lint and fix
uv run ruff check --fix .

# Type checking
uv run mypy nakheel/
```

### Pre-commit Hooks

Install pre-commit for automatic checks:

```bash
uv pip install pre-commit
pre-commit install
```

## License

Part of the Hena Wadeena project - see root LICENSE file.

## Related Services

- **Identity Service** (:8001) - Authentication and user management
- **Market Service** (:8002) - Marketplace for local products
- **Guide-Booking Service** (:8003) - Tour guide reservations
- **Map Service** (:8004) - Geospatial data and attractions

## Contact

For questions specific to the AI service, see the main project README or open an issue.
