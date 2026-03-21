# 🌴 Nakheel RAG Chatbot — Full Developer Guide
### Platform: HENA-WADEENA | Domain: New Valley Governorate, Egypt
### Version: 1.0 | Classification: Internal Technical Specification

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack Reference](#3-technology-stack-reference)
4. [Project Structure](#4-project-structure)
5. [Data Models & Schemas](#5-data-models--schemas)
6. [Ingestion Pipeline (Inject Doc)](#6-ingestion-pipeline-inject-doc)
7. [Retrieval Pipeline (Hybrid Search)](#7-retrieval-pipeline-hybrid-search)
8. [Generation Pipeline (LLM + Anti-Hallucination)](#8-generation-pipeline-llm--anti-hallucination)
9. [Multilingual Strategy (Arabic / English)](#9-multilingual-strategy-arabic--english)
10. [API Endpoints — Full Specification](#10-api-endpoints--full-specification)
11. [Chat Session & Context Management](#11-chat-session--context-management)
12. [Anti-Hallucination Framework](#12-anti-hallucination-framework)
13. [Chunking Strategy](#13-chunking-strategy)
14. [Embedding Strategy (BGE)](#14-embedding-strategy-bge)
15. [Qdrant Index Design](#15-qdrant-index-design)
16. [MongoDB Schema Design](#16-mongodb-schema-design)
17. [Ranking & Reranking Strategy](#17-ranking--reranking-strategy)
18. [Configuration & Environment Variables](#18-configuration--environment-variables)
19. [Error Handling Strategy](#19-error-handling-strategy)
20. [Security Considerations](#20-security-considerations)
21. [Performance & Scalability Notes](#21-performance--scalability-notes)
22. [Developer Checklist](#22-developer-checklist)

---

## 1. System Overview

### 1.1 Purpose

**Nakheel** is a bilingual (Arabic/English) domain-restricted RAG (Retrieval-Augmented Generation) chatbot embedded in the **HENA-WADEENA** platform. Its sole purpose is to answer user questions related to **New Valley Governorate (محافظة الوادي الجديد)** in Egypt.

- It serves **Egyptian and non-Egyptian users**.
- It **detects** the language and dialect of each question and **responds in kind** (Egyptian Arabic dialect, Modern Standard Arabic, or English).
- It **refuses** to answer any question outside its knowledge domain using a structured anti-hallucination guard.

### 1.2 Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| Domain Restriction | Anti-hallucination guardrails at retrieval and generation stages |
| Multilingual | BGE multilingual embeddings + language detection + dialect-aware prompting |
| Hybrid Search | Dense (semantic) + Sparse (BM25 lexical) vectors fused via RRF |
| Context Continuity | 10-message sliding context window per session |
| Grounded Answers | All answers must cite retrieved context; no free-form hallucination |
| Auditability | Full tracing: query → retrieved chunks → reranked chunks → answer logged in MongoDB |

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                            HENA-WADEENA Platform                               │
│                                                                                │
│  ┌──────────┐     ┌──────────────────────────────────────────────────────┐    │
│  │  Client  │────▶│               FastAPI Application Layer               │    │
│  │ (Web/App)│◀────│  (REST endpoints + Auth Middleware + Rate Limiter)   │    │
│  └──────────┘     └────────────┬────────────────────────┬────────────────┘    │
│                                │                        │                      │
│                ┌───────────────▼────────┐  ┌───────────▼───────────────┐     │
│                │   INGESTION PIPELINE   │  │   RETRIEVAL + GENERATION  │     │
│                │                        │  │         PIPELINE          │     │
│                │  PDF ──▶ Docling       │  │  Query ──▶ Lang Detect    │     │
│                │         (Markdown)     │  │       ──▶ Embed (BGE)     │     │
│                │  ──▶ Section Chunker   │  │       ──▶ Hybrid Search   │     │
│                │  ──▶ BGE Embed        │  │           (Qdrant)        │     │
│                │  ──▶ Qdrant Index     │  │       ──▶ Rerank (BGE)    │     │
│                │  ──▶ Mongo Metadata   │  │       ──▶ Domain Guard    │     │
│                └────────────────────────┘  │       ──▶ LLM (OpenAI)   │     │
│                                            │       ──▶ Response        │     │
│                                            └───────────────────────────┘     │
│                                                                                │
│   ┌────────────────────────────┐   ┌──────────────────────────────────────┐  │
│   │   Qdrant Vector DB         │   │          MongoDB                     │  │
│   │  - Dense collection        │   │  - documents (metadata)              │  │
│   │  - Sparse collection       │   │  - chunks (text + meta)              │  │
│   │  - Payload: chunk_id       │   │  - sessions (chat history)           │  │
│   │           doc_id           │   │  - messages (full logs)              │  │
│   │           language         │   │  - audit_logs                        │  │
│   └────────────────────────────┘   └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Data Flow Summary

**Ingestion Flow:**
```
PDF Upload → Docling Parse → Section-Based Chunker (20% overlap)
→ Language Detection per chunk → BGE Dense Embedding + BM25 Sparse Embedding
→ Qdrant Upsert (both vectors) → MongoDB Metadata Store
```

**Query Flow:**
```
User Message → Language Detection → Session Lookup (10-msg context)
→ BGE Embed Query → Hybrid Search (Qdrant dense + sparse)
→ RRF Fusion → BGE Reranker → Domain Relevance Guard
→ Context Assembly → OpenAI LLM (dialect-aware prompt)
→ Response → Session Update → MongoDB Log
```

---

## 3. Technology Stack Reference

### 3.1 Core Components

| Component | Technology | Role | Key Config |
|-----------|-----------|------|-----------|
| API Framework | FastAPI | REST API server | Async, with Pydantic v2 validation |
| PDF Parser | Docling | PDF → structured Markdown | Table + figure extraction |
| Vector DB | Qdrant | Hybrid vector storage & search | In-memory or cloud |
| Document DB | MongoDB (Motor async) | Metadata, sessions, logs | Atlas or self-hosted |
| Embeddings | BGE (BAAI) | Dense + reranking | `bge-m3` (multilingual) |
| Sparse Embeddings | BM25 / SPLADE | Lexical matching | via `qdrant_client` sparse |
| LLM | OpenAI API | Chat completion | `gpt-4o` recommended |
| Language Detection | `langdetect` / `fasttext` | Arabic vs English routing | Per-message detection |
| Reranker | BGE Reranker | Cross-encoder reranking | `bge-reranker-v2-m3` |
| Task Queue (optional) | Celery + Redis | Async ingestion for large PDFs | Background jobs |

### 3.2 Python Package List

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-multipart              # file upload support
pydantic>=2.0
motor>=3.4.0                  # async MongoDB driver
pymongo>=4.7.0
qdrant-client>=1.9.0
docling>=1.0.0                # PDF parser
FlagEmbedding>=1.2.9          # BGE embeddings + reranker
openai>=1.30.0
langdetect>=1.0.9
python-dotenv>=1.0.0
tiktoken>=0.7.0               # token counting for context window
redis>=5.0.0                  # session caching (optional)
celery>=5.4.0                 # async task queue (optional)
httpx>=0.27.0
loguru>=0.7.0                 # structured logging
```

---

## 4. Project Structure

```
nakheel/
│
├── main.py                          # FastAPI app entry point
├── config.py                        # All settings via pydantic-settings
├── requirements.txt
├── .env                             # (never commit)
├── .env.example
│
├── api/
│   ├── __init__.py
│   ├── router.py                    # Central router aggregation
│   ├── deps.py                      # Shared dependencies (DB clients, etc.)
│   └── endpoints/
│       ├── inject.py                # POST /documents/inject
│       ├── parse.py                 # POST /documents/parse
│       ├── remove.py                # DELETE /documents/{doc_id}
│       ├── chat.py                  # POST /chat/sessions, GET /chat/sessions/{id}
│       ├── message.py               # POST /chat/sessions/{id}/messages
│       └── health.py                # GET /health
│
├── core/
│   ├── __init__.py
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── parser.py                # Docling PDF → Markdown
│   │   ├── chunker.py               # Section-based chunker with 20% overlap
│   │   ├── embedder.py              # BGE dense embedder
│   │   ├── sparse_embedder.py       # BM25/SPLADE sparse embedder
│   │   └── indexer.py               # Qdrant + Mongo upsert orchestrator
│   │
│   ├── retrieval/
│   │   ├── __init__.py
│   │   ├── query_processor.py       # Query language detect + embed
│   │   ├── hybrid_search.py         # Dense + Sparse search in Qdrant
│   │   ├── rrf_fusion.py            # Reciprocal Rank Fusion
│   │   └── reranker.py              # BGE cross-encoder reranker
│   │
│   ├── generation/
│   │   ├── __init__.py
│   │   ├── domain_guard.py          # Anti-hallucination / domain relevance check
│   │   ├── context_builder.py       # Assemble LLM context from chunks
│   │   ├── prompt_builder.py        # Dialect-aware system + user prompt
│   │   └── llm_client.py            # OpenAI API wrapper
│   │
│   └── session/
│       ├── __init__.py
│       ├── session_manager.py       # Create/read/update sessions
│       └── context_window.py        # 10-message sliding window logic
│
├── db/
│   ├── __init__.py
│   ├── mongo.py                     # Motor client + collections
│   └── qdrant.py                    # Qdrant client + collection setup
│
├── models/
│   ├── __init__.py
│   ├── document.py                  # Pydantic models for documents
│   ├── chunk.py                     # Pydantic models for chunks
│   ├── session.py                   # Pydantic models for sessions
│   └── message.py                   # Pydantic models for messages
│
├── utils/
│   ├── __init__.py
│   ├── language.py                  # Language & dialect detection
│   ├── text_cleaning.py             # Arabic/English text normalization
│   └── token_counter.py             # tiktoken helpers
│
└── tests/
    ├── test_ingestion.py
    ├── test_retrieval.py
    ├── test_generation.py
    └── test_api.py
```

---

## 5. Data Models & Schemas

### 5.1 Pydantic Models

#### Document

```python
# models/document.py

class DocumentStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    INDEXED    = "indexed"
    FAILED     = "failed"

class DocumentMetadata(BaseModel):
    doc_id:        str          # UUID4, primary key
    filename:      str          # original PDF filename
    title:         Optional[str]
    language:      str          # "ar" | "en" | "mixed"
    total_pages:   int
    total_chunks:  int
    file_size_kb:  float
    uploaded_at:   datetime
    indexed_at:    Optional[datetime]
    status:        DocumentStatus
    qdrant_ids:    List[str]    # all vector point IDs in Qdrant
    tags:          List[str]    # optional domain tags
    description:   Optional[str]
```

#### Chunk

```python
# models/chunk.py

class Chunk(BaseModel):
    chunk_id:        str         # UUID4
    doc_id:          str         # parent document
    chunk_index:     int         # sequential number
    section_title:   Optional[str]
    parent_section:  Optional[str]
    text:            str         # cleaned chunk text
    text_ar:         Optional[str]  # if source is bilingual
    language:        str         # detected language of this chunk
    page_numbers:    List[int]   # source page range
    token_count:     int
    char_count:      int
    overlap_prev:    Optional[str]  # overlap text from previous chunk
    overlap_next:    Optional[str]  # overlap text from next chunk
    created_at:      datetime
```

#### Session

```python
# models/session.py

class Session(BaseModel):
    session_id:   str           # UUID4
    user_id:      Optional[str] # platform user ID (if authenticated)
    created_at:   datetime
    updated_at:   datetime
    language:     Optional[str] # dominant language of session
    message_count: int
    is_active:    bool
    metadata:     Dict[str, Any]  # platform-specific extras
```

#### Message

```python
# models/message.py

class MessageRole(str, Enum):
    USER      = "user"
    ASSISTANT = "assistant"
    SYSTEM    = "system"

class RetrievedChunkRef(BaseModel):
    chunk_id:      str
    doc_id:        str
    section_title: Optional[str]
    score:         float          # reranker score
    text_snippet:  str            # first 200 chars

class Message(BaseModel):
    message_id:        str
    session_id:        str
    role:              MessageRole
    content:           str
    language:          str           # detected language
    created_at:        datetime
    retrieved_chunks:  List[RetrievedChunkRef]  # populated for assistant msgs
    domain_relevant:   Optional[bool]            # result of domain guard
    llm_model:         Optional[str]
    prompt_tokens:     Optional[int]
    completion_tokens: Optional[int]
    latency_ms:        Optional[int]
```

---

## 6. Ingestion Pipeline (Inject Doc)

### 6.1 Pipeline Steps

```
Step 1: Receive PDF
Step 2: Save to temp storage + generate doc_id (UUID4)
Step 3: Persist initial metadata to MongoDB (status: PENDING)
Step 4: Docling Parse → Markdown
Step 5: Section Detector → Identify section boundaries
Step 6: Section-Based Chunker with 20% overlap
Step 7: Language Detection per chunk
Step 8: Token count per chunk
Step 9: BGE Dense Embedding (batch)
Step 10: BM25 Sparse Embedding (batch)
Step 11: Qdrant Upsert (dense + sparse, with payload)
Step 12: MongoDB Upsert (all chunk metadata)
Step 13: Update document status → INDEXED
```

### 6.2 Docling Parser (`core/ingestion/parser.py`)

**Docling** converts PDF to structured Markdown, preserving:
- Headings (H1–H6)
- Tables (as Markdown tables)
- Lists
- Figures with captions
- Reading order

**Configuration to use:**

```python
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions

pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = True               # Enable OCR for scanned PDFs
pipeline_options.do_table_structure = True   # Extract tables
pipeline_options.table_structure_options.do_cell_matching = True

converter = DocumentConverter(
    format_options={
        InputFormat.PDF: PdfFormatOption(
            pipeline_options=pipeline_options
        )
    }
)
result = converter.convert(pdf_path)
markdown_output = result.document.export_to_markdown()
```

**Output contract:**
- Returns a `str` (Markdown)
- Saves Markdown to `temp/parsed/{doc_id}.md`
- Raises `ParseError` on failure

**Arabic PDF notes:**
- Enable OCR for right-to-left text
- Docling handles RTL natively
- Check that table cells preserve Arabic text correctly

### 6.3 Section-Based Chunker (`core/ingestion/chunker.py`)

#### Why Section-Based Chunking

Section-based chunking respects the logical structure of the document. A "section" is defined by a Markdown heading (H1–H4). Chunks do not cross section boundaries unless a section is itself too short, in which case it may be merged with the next.

#### Algorithm

```
INPUT: Markdown string from Docling

1.  Parse Markdown → identify all heading lines (# ## ### ####)
2.  Split document into SECTIONS at each heading boundary
3.  For each section:
    a. If section text tokens < MIN_CHUNK_TOKENS (e.g., 50):
       → merge with next section
    b. If section text tokens <= MAX_CHUNK_TOKENS (e.g., 512):
       → emit as single chunk
    c. If section text tokens > MAX_CHUNK_TOKENS:
       → split into sub-chunks by paragraph or sentence boundary
       → apply 20% overlap between consecutive sub-chunks
4.  For overlap:
    overlap_size = round(chunk_token_count * 0.20)
    → append last `overlap_size` tokens of chunk[i] to start of chunk[i+1]
    → store overlap_prev and overlap_next fields separately (for transparency)
5.  Assign chunk_index (sequential, document-scoped)
6.  Record: section_title, parent_section, page_numbers, token_count

OUTPUT: List[Chunk]
```

#### Chunking Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `MAX_CHUNK_TOKENS` | 512 | BGE-M3 context limit is 8192 but 512 yields better precision |
| `MIN_CHUNK_TOKENS` | 50 | Avoid tiny chunks with no semantic content |
| `OVERLAP_RATIO` | 0.20 | 20% overlap = ~102 tokens overlap on 512-token chunk |
| `OVERLAP_UNIT` | tokens | More precise than characters |
| `SPLIT_UNIT` | paragraph, then sentence | Prefer paragraph splits; fall back to sentence |

#### Overlap Implementation Detail

```
Chunk[i]   = [T1, T2, T3, ..., T512]
Overlap    = last 102 tokens of Chunk[i] = [T411, ..., T512]
Chunk[i+1] = [T411, ..., T512, T513, ..., T1024]

Store separately:
  chunk[i+1].overlap_prev = " ".join(tokens T411..T512)
  chunk[i+1].text = FULL text including overlap (so retrieval works)
  chunk[i+1].text_no_overlap = text from T513 onward (for display)
```

The `text` field used for embedding and retrieval **includes the overlap prefix**, ensuring semantic continuity. The overlap is stored separately for display/audit.

---

## 7. Retrieval Pipeline (Hybrid Search)

### 7.1 Overview

The retrieval pipeline executes **both dense and sparse search in parallel**, then fuses results using **Reciprocal Rank Fusion (RRF)**, and finally applies a **BGE cross-encoder reranker**.

```
User Query
   │
   ├─── BGE-M3 Dense Embed ──────────────────▶ Qdrant Dense Search (top-K=20)  ─┐
   │                                                                              ├─▶ RRF Fusion ──▶ Top-N=10 ──▶ BGE Reranker ──▶ Top-K=5
   └─── BM25 Sparse Embed ───────────────────▶ Qdrant Sparse Search (top-K=20) ─┘
```

### 7.2 Dense Search

- **Model:** `BAAI/bge-m3` (multilingual, supports Arabic + English natively)
- **Vector dimension:** 1024
- **Distance metric:** Cosine similarity
- **Top-K:** 20 candidates

**Query encoding note:** BGE-M3 requires a special instruction prefix for queries (not for documents):
```python
# For DOCUMENTS (at ingestion time):
passage_embeddings = model.encode(["text of chunk..."])

# For QUERIES (at retrieval time):
query_embeddings = model.encode(
    ["Represent this sentence for searching relevant passages: {query}"],
    is_query=True   # or use the encode_queries() method
)
```

### 7.3 Sparse Search (BM25 / SPLADE)

BM25 sparse vectors improve exact-match retrieval (especially for proper nouns, Arabic place names, codes, IDs).

**Implementation approach using Qdrant's native sparse:**

```python
# At indexing: compute sparse vector using BM25Encoder
from qdrant_client.models import SparseVector

bm25_encoder = BM25Encoder()      # from qdrant_client or fastembed
bm25_encoder.fit(all_corpus_texts) # fit on your corpus
sparse_vec = bm25_encoder.encode_document(chunk_text)

# Returns: SparseVector(indices=[...], values=[...])
```

**Qdrant sparse vector config:**
```python
# In collection creation:
sparse_vectors_config={
    "text-sparse": SparseVectorParams(
        index=SparseIndexParams(on_disk=False)
    )
}
```

### 7.4 Reciprocal Rank Fusion (RRF)

RRF combines ranked lists from dense and sparse search without requiring score normalization.

**Formula:**
```
RRF_score(doc) = Σ  1 / (k + rank_i(doc))
               i∈sources

where k = 60  (standard constant)
```

**Implementation (`core/retrieval/rrf_fusion.py`):**

```
INPUTS:
  dense_results:  List[(chunk_id, score, payload)]  # top-20 from dense
  sparse_results: List[(chunk_id, score, payload)]  # top-20 from sparse

ALGORITHM:
  1. Create dict: rrf_scores = {}
  2. For each (chunk_id, rank) in dense_results:
       rrf_scores[chunk_id] += 1 / (60 + rank)
  3. For each (chunk_id, rank) in sparse_results:
       rrf_scores[chunk_id] += 1 / (60 + rank)
  4. Deduplicate by chunk_id (union of both lists)
  5. Sort by rrf_score descending
  6. Return top-N=10

OUTPUT: List[(chunk_id, rrf_score, payload)]
```

**Dense vs Sparse weight (optional):**
You may want to weight dense results higher for semantic queries and sparse higher for keyword-heavy queries. Implement as:
```
rrf_score(doc) = α * (1 / (k + dense_rank)) + β * (1 / (k + sparse_rank))
where α=0.7, β=0.3  (tunable hyperparameter)
```

### 7.5 BGE Reranker (`core/retrieval/reranker.py`)

After RRF fusion produces top-10 candidates, a **cross-encoder** reranker scores each (query, chunk) pair more precisely.

- **Model:** `BAAI/bge-reranker-v2-m3` (multilingual)
- **Input:** (query_text, chunk_text) pairs
- **Output:** relevance score ∈ [0, 1]
- **Action:** Sort by score, take top-K=5

**Important:** The reranker operates on raw text, **including** the overlap prefix in the chunk text, for maximum semantic accuracy.

```python
from FlagEmbedding import FlagReranker

reranker = FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=True)

pairs = [(query, chunk.text) for chunk in fused_candidates]
scores = reranker.compute_score(pairs, normalize=True)

# Zip scores back with chunks, sort descending
reranked = sorted(zip(scores, fused_candidates), reverse=True)
top_chunks = [chunk for _, chunk in reranked[:5]]
```

---

## 8. Generation Pipeline (LLM + Anti-Hallucination)

### 8.1 Pipeline Steps

```
Step 1:  Retrieve top-5 reranked chunks
Step 2:  Domain Relevance Guard (check if any chunk is relevant enough)
Step 3:  Fetch session context (last 10 messages)
Step 4:  Detect language + dialect of current user query
Step 5:  Build system prompt (role + domain restriction + dialect instruction)
Step 6:  Build user prompt (context + question)
Step 7:  Call OpenAI API (with full message history)
Step 8:  Post-process response (strip any off-domain text if leaked)
Step 9:  Log full audit trail to MongoDB
Step 10: Return response to user
```

### 8.2 OpenAI Client (`core/generation/llm_client.py`)

**Model:** `gpt-4o` (recommended) or `gpt-4o-mini` for cost optimization.

**API call structure:**

```python
messages = [
    {"role": "system", "content": system_prompt},
    # Last 10 messages from session history (role: user/assistant)
    *session_context_messages,
    {"role": "user", "content": user_prompt_with_context}
]

response = openai_client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    temperature=0.3,       # Lower = more factual, less creative
    max_tokens=1024,
    top_p=0.9,
    frequency_penalty=0.0,
    presence_penalty=0.0,
)
```

**Token budget management:**
```
Total context window: ~128K tokens (gpt-4o)
Budget allocation:
  - System prompt:         ~500 tokens  (fixed)
  - Retrieved context:     ~3000 tokens (5 chunks × ~600 tokens avg)
  - Chat history (10 msgs):~2000 tokens (variable, trim if needed)
  - User query:            ~100 tokens  (variable)
  - Response buffer:       1024 tokens  (max_tokens)
  ─────────────────────────────────────
  Total used:              ~6624 tokens (well within budget)
```

If chat history exceeds budget: remove oldest messages first (sliding window).

---

## 9. Multilingual Strategy (Arabic / English)

### 9.1 Language Detection (`utils/language.py`)

Every incoming message is analyzed before processing.

**Detection layers:**

| Layer | Tool | Purpose |
|-------|------|---------|
| Script detection | Unicode block analysis | Determine if Arabic script is present |
| Language detection | `langdetect` or `fasttext` | Distinguish Arabic dialects from MSA vs English |
| Dialect hints | Keyword list (Egyptian Arabic markers) | Classify Egyptian Arabic vs Gulf Arabic vs MSA |

**Language codes used internally:**

| Code | Meaning |
|------|---------|
| `ar-eg` | Egyptian Arabic dialect (عامية مصرية) |
| `ar-msa` | Modern Standard Arabic (فصحى) |
| `ar-other` | Other Arabic dialect |
| `en` | English |
| `mixed` | Code-switching (Arabic + English in same message) |

**Detection function contract:**

```python
def detect_language(text: str) -> LanguageDetectionResult:
    """
    Returns:
        code:     str (e.g., "ar-eg", "en")
        script:   str ("arabic" | "latin" | "mixed")
        confidence: float (0.0 - 1.0)
    """
```

### 9.2 Dialect-Aware Prompt Construction

The system prompt changes dynamically based on detected language:

**English query → English response:**
```
You are Nakheel, the official assistant for the HENA-WADEENA platform.
You provide information exclusively about New Valley Governorate in Egypt.
Respond clearly in English.
```

**Egyptian Arabic query → Egyptian Arabic response:**
```
انت نخيل، المساعد الرسمي لمنصة هنا وادينا.
بتجاوب بس على الأسئلة المتعلقة بمحافظة الوادي الجديد في مصر.
ارد بالعامية المصرية الواضحة.
```

**MSA query → MSA response:**
```
أنت نخيل، المساعد الرسمي لمنصة هنا وادينا.
تُجيب حصراً على الأسئلة المتعلقة بمحافظة الوادي الجديد في مصر.
أجب بالعربية الفصحى السهلة.
```

**Mixed code-switching:** Default to matching the dominant script. If Arabic script > 50%, use Egyptian Arabic response.

### 9.3 BGE-M3 Multilingual Notes

- `BAAI/bge-m3` supports 100+ languages including Arabic natively.
- **No separate models** needed for Arabic vs English — a single model handles both.
- Arabic text should be **lightly normalized** before embedding (see `utils/text_cleaning.py`):
  - Normalize Alef variants (أ إ آ → ا)
  - Remove tashkeel (diacritics) unless domain requires them
  - Normalize ta marbuta (ة → ه) — optional, test both
  - Strip excess whitespace
  - Do NOT aggressively stemize — BGE handles morphology internally

---

## 10. API Endpoints — Full Specification

### Base URL
```
https://api.hena-wadeena.com/api/v1
```

All endpoints return `application/json`. Error responses follow RFC 7807 Problem Details format.

---

### 10.1 `POST /documents/inject`

**Purpose:** Full ingestion pipeline — parse PDF, chunk, embed, index.

**Request:**
```
Content-Type: multipart/form-data

Fields:
  file:        (file, required)     PDF file
  title:       (string, optional)   Human-readable title
  description: (string, optional)   Short description
  tags:        (string[], optional) Domain tags (e.g., ["tourism", "history"])
  language:    (string, optional)   Hint: "ar" | "en" | "mixed" | "auto" (default: "auto")
  async:       (bool, optional)     If true, run in background (default: false)
```

**Response 202 (async=true):**
```json
{
  "doc_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Document accepted for processing",
  "status_url": "/api/v1/documents/550e8400-e29b-41d4-a716-446655440000/status"
}
```

**Response 200 (async=false):**
```json
{
  "doc_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "indexed",
  "filename": "new_valley_tourism_guide.pdf",
  "total_pages": 48,
  "total_chunks": 127,
  "language": "mixed",
  "indexed_at": "2025-10-01T12:34:56Z",
  "qdrant_point_count": 127,
  "processing_time_ms": 8432
}
```

**Error responses:**
```json
// 400 Bad Request (not a PDF)
{ "error": "INVALID_FILE_TYPE", "detail": "Only PDF files are accepted" }

// 413 Payload Too Large
{ "error": "FILE_TOO_LARGE", "detail": "Maximum file size is 50MB" }

// 422 Processing Failed
{ "error": "PARSE_ERROR", "detail": "Docling failed to parse document", "doc_id": "..." }
```

**Processing pipeline detail (async=false):**
1. Validate file (PDF, ≤50MB)
2. Save to `/tmp/nakheel/{doc_id}/original.pdf`
3. Create MongoDB doc record (status: PENDING)
4. Docling parse → `/tmp/nakheel/{doc_id}/parsed.md`
5. Section chunker → List[Chunk]
6. Language detect per chunk
7. Token count per chunk
8. BGE-M3 batch encode → dense vectors
9. BM25 batch encode → sparse vectors
10. Qdrant upsert all points
11. MongoDB insert all chunks
12. Update doc status → INDEXED
13. Cleanup temp files
14. Return response

---

### 10.2 `POST /documents/parse`

**Purpose:** Parse-only — returns the Markdown output of Docling. No indexing.

**Request:**
```
Content-Type: multipart/form-data

Fields:
  file:     (file, required)   PDF file
  format:   (string, optional) "markdown" | "json" (default: "markdown")
```

**Response 200:**
```json
{
  "filename": "report.pdf",
  "format": "markdown",
  "content": "# عنوان الوثيقة\n\nمحتوى الفقرة الأولى...",
  "total_pages": 12,
  "word_count": 3421,
  "language_detected": "ar",
  "processing_time_ms": 1204,
  "download_url": "/api/v1/documents/parsed/temp-abc123.md"
}
```

**Notes:**
- The parsed Markdown is stored temporarily (TTL: 1 hour) and accessible via `download_url`
- This endpoint is useful for **reviewing parse quality** before full ingestion
- Does NOT create any MongoDB records or Qdrant vectors

---

### 10.3 `DELETE /documents/{doc_id}`

**Purpose:** Remove a document — deletes all vectors from Qdrant AND all metadata from MongoDB.

**Path parameter:**
```
doc_id: string (UUID4)
```

**Request body (optional):**
```json
{
  "confirm": true,
  "reason": "Outdated document"
}
```

**Response 200:**
```json
{
  "doc_id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted": true,
  "qdrant_points_deleted": 127,
  "mongo_chunks_deleted": 127,
  "mongo_document_deleted": true,
  "deleted_at": "2025-10-01T13:00:00Z"
}
```

**Error responses:**
```json
// 404 Not Found
{ "error": "DOCUMENT_NOT_FOUND", "detail": "No document with id: ..." }

// 409 Conflict (document still processing)
{ "error": "DOCUMENT_PROCESSING", "detail": "Cannot delete document while it is being processed" }
```

**Deletion logic:**
1. Fetch document record from MongoDB (validate exists)
2. Check status ≠ PROCESSING (prevent partial deletion)
3. Fetch all `qdrant_ids` from document record
4. Qdrant: `client.delete(collection_name, points_selector=qdrant_ids)`
5. MongoDB: `db.chunks.delete_many({"doc_id": doc_id})`
6. MongoDB: `db.documents.delete_one({"doc_id": doc_id})`
7. Log deletion event to `audit_logs`
8. Return summary

---

### 10.4 `POST /chat/sessions`

**Purpose:** Create a new chat session for a user.

**Request:**
```json
{
  "user_id": "user-123",          // optional (platform user ID)
  "language_preference": "ar-eg", // optional; default: "auto"
  "metadata": {                    // optional extra platform context
    "platform": "web",
    "source": "homepage_widget"
  }
}
```

**Response 201:**
```json
{
  "session_id": "sess-abc-123-...",
  "user_id": "user-123",
  "created_at": "2025-10-01T12:00:00Z",
  "language_preference": "ar-eg",
  "message_count": 0,
  "is_active": true,
  "welcome_message": "أهلاً! أنا نخيل، مساعدك في منصة هنا وادينا. ممكن أساعدك بأي سؤال عن الوادي الجديد 🌴"
}
```

**Notes:**
- The `welcome_message` is static and localized based on `language_preference`
- Session ID is used in all subsequent `/messages` calls
- Session TTL: 24 hours of inactivity (configurable)

---

### 10.5 `POST /chat/sessions/{session_id}/messages`

**Purpose:** Send a user message and receive Nakheel's response. Core chat endpoint.

**Path parameter:**
```
session_id: string
```

**Request:**
```json
{
  "content": "إيه أحسن أماكن السياحة في الوادي الجديد؟",
  "language": "auto"   // optional hint; default: "auto" (auto-detect)
}
```

**Response 200:**
```json
{
  "message_id": "msg-xyz-789",
  "session_id": "sess-abc-123",
  "role": "assistant",
  "content": "الوادي الجديد فيه أماكن سياحية جميلة جداً! من أبرزها:\n\n- **واحة الخارجة**: أقدم واحة في المحافظة وفيها آثار فرعونية رائعة...\n- **واحة الداخلة**: اشتهرت بالمياه الجوفية الدافية والمناطق الأثرية...",
  "language": "ar-eg",
  "created_at": "2025-10-01T12:01:15Z",
  "sources": [
    {
      "chunk_id": "chk-001",
      "doc_id": "doc-555",
      "section_title": "السياحة في الوادي الجديد",
      "relevance_score": 0.94,
      "text_snippet": "واحة الخارجة من أهم المناطق السياحية..."
    }
  ],
  "domain_relevant": true,
  "latency_ms": 1843
}
```

**Response when out-of-domain:**
```json
{
  "message_id": "msg-xyz-790",
  "role": "assistant",
  "content": "آسف، أنا نخيل وبتكلم بس في حاجات محافظة الوادي الجديد. مش قادر أساعدك في ده الموضوع، بس لو عندك سؤال عن الوادي الجديد أنا هنا! 😊",
  "language": "ar-eg",
  "domain_relevant": false,
  "sources": []
}
```

**Internal processing flow for this endpoint:**

```
1. Validate session_id exists and is active
2. Validate message content (non-empty, ≤2000 chars)
3. Detect language of user message → language_code
4. Save user message to MongoDB (role: "user")
5. Embed query → dense + sparse vectors (BGE-M3)
6. Hybrid search in Qdrant → top-20 dense, top-20 sparse
7. RRF fusion → top-10
8. BGE reranker → top-5
9. Domain Guard check:
   a. If top reranker score < RELEVANCE_THRESHOLD (e.g., 0.35):
      → mark as out-of-domain
      → return canned out-of-domain response (language-matched)
      → skip LLM call
10. Build system prompt (role + domain + dialect)
11. Fetch last 10 messages from session (context window)
12. Build user prompt (retrieved context + question)
13. Call OpenAI API
14. Save assistant message to MongoDB (with sources, scores, tokens)
15. Update session.updated_at, session.message_count
16. Return response
```

---

### 10.6 `GET /chat/sessions/{session_id}`

**Purpose:** Retrieve session info and message history.

**Query parameters:**
```
page:     int (default: 1)
per_page: int (default: 20, max: 100)
```

**Response 200:**
```json
{
  "session_id": "sess-abc-123",
  "user_id": "user-123",
  "created_at": "2025-10-01T12:00:00Z",
  "updated_at": "2025-10-01T12:05:00Z",
  "is_active": true,
  "message_count": 6,
  "messages": [
    {
      "message_id": "msg-001",
      "role": "user",
      "content": "إيه أحسن أماكن السياحة في الوادي الجديد؟",
      "language": "ar-eg",
      "created_at": "2025-10-01T12:01:00Z"
    },
    {
      "message_id": "msg-002",
      "role": "assistant",
      "content": "...",
      "language": "ar-eg",
      "created_at": "2025-10-01T12:01:15Z",
      "sources": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_messages": 6,
    "total_pages": 1
  }
}
```

---

### 10.7 `DELETE /chat/sessions/{session_id}`

**Purpose:** Close/archive a session (soft delete — keeps logs for audit).

**Response 200:**
```json
{
  "session_id": "sess-abc-123",
  "closed": true,
  "message_count": 6,
  "closed_at": "2025-10-01T13:00:00Z"
}
```

---

### 10.8 `GET /documents`

**Purpose:** List all indexed documents (admin endpoint).

**Query parameters:**
```
page:       int
per_page:   int
status:     string (pending|processing|indexed|failed)
language:   string (ar|en|mixed)
tags:       string (comma-separated)
```

**Response 200:**
```json
{
  "documents": [...],
  "pagination": { "total": 42, "page": 1, "per_page": 10 }
}
```

---

### 10.9 `GET /documents/{doc_id}/status`

**Purpose:** Poll ingestion status for async jobs.

**Response 200:**
```json
{
  "doc_id": "...",
  "status": "processing",
  "progress_percent": 67,
  "current_step": "embedding",
  "estimated_remaining_seconds": 12
}
```

---

### 10.10 `GET /health`

**Purpose:** System health check.

**Response 200:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected",
    "openai": "reachable",
    "bge_model": "loaded"
  },
  "uptime_seconds": 3600
}
```

---

## 11. Chat Session & Context Management

### 11.1 Session Lifecycle

```
CREATE SESSION
      │
      ▼
  ACTIVE (accepts messages)
      │
      ├──── 24h inactivity ────▶ EXPIRED (auto-close, keep logs)
      │
      └──── DELETE request ────▶ CLOSED (soft delete, keep logs)
```

### 11.2 Context Window (10-message sliding window)

The LLM receives a maximum of **10 messages** of chat history in its context, plus the current user message.

**Implementation (`core/session/context_window.py`):**

```
INPUTS:
  session_id: str
  current_user_message: str

ALGORITHM:
  1. Fetch all messages for session from MongoDB, sorted by created_at ASC
  2. Take last 10 messages (index -10 to -1)
     - Include both user and assistant turns
     - This guarantees ≤5 back-and-forth exchanges
  3. Format as OpenAI message dicts:
     [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}, ...]
  4. Count tokens (tiktoken): if total > TOKEN_BUDGET_HISTORY (2000 tokens):
     → trim oldest messages one by one until within budget
  5. Append current user message at end (NOT yet saved to DB)

OUTPUT: List[Dict] for OpenAI messages array
```

**Context window note:** The retrieved document context is injected **into the last user message** via the `prompt_builder`, NOT as a separate message. This prevents context confusion.

```
Final user message structure:

"Based on the following information about New Valley Governorate:

---
[CONTEXT CHUNK 1: section title]
{chunk_text}

[CONTEXT CHUNK 2: section title]
{chunk_text}
---

User question: {original_user_question}"
```

---

## 12. Anti-Hallucination Framework

This is the **most critical** part of the system. Nakheel must NEVER answer questions outside its domain.

### 12.1 Three-Layer Defense

```
Layer 1: RETRIEVAL GUARD (before LLM)
Layer 2: PROMPT INSTRUCTION (inside LLM)
Layer 3: RESPONSE GUARD (after LLM)
```

### 12.2 Layer 1 — Retrieval Guard (`core/generation/domain_guard.py`)

After reranking, check if the top retrieved chunk is relevant enough to the domain.

**Threshold check:**
```python
RELEVANCE_THRESHOLD = 0.35  # Tunable parameter

def is_domain_relevant(reranked_chunks: List[ScoredChunk]) -> bool:
    if not reranked_chunks:
        return False
    top_score = reranked_chunks[0].score
    return top_score >= RELEVANCE_THRESHOLD
```

**If `is_domain_relevant = False`:**
- Do NOT call the LLM
- Return a pre-written, language-matched refusal message
- Log this as `domain_relevant: false` in MongoDB

**Out-of-domain messages (localized):**

| Language | Message |
|----------|---------|
| `ar-eg` | آسف، أنا نخيل وبتكلم بس في حاجات محافظة الوادي الجديد. مش قادر أساعدك في ده، بس لو عندك سؤال عن الوادي الجديد يسعدني أساعدك! |
| `ar-msa` | عذراً، أنا نخيل ومتخصص فقط في معلومات محافظة الوادي الجديد. لا أستطيع الإجابة عن هذا السؤال، لكن يسعدني مساعدتك في كل ما يخص الوادي الجديد. |
| `en` | Sorry, I'm Nakheel and I can only help with questions about New Valley Governorate. I'm not able to answer this, but feel free to ask anything about New Valley! |

### 12.3 Layer 2 — Prompt Instruction

The system prompt includes **explicit domain restriction instructions**:

**English system prompt template:**
```
You are Nakheel, the intelligent assistant for the HENA-WADEENA platform.
Your ONLY purpose is to answer questions about New Valley Governorate (Wadi El Gedid) in Egypt.

STRICT RULES:
1. ONLY answer based on the provided context documents. Never invent facts.
2. If the provided context does not contain enough information to answer, say so explicitly — do NOT guess or extrapolate.
3. NEVER answer questions about topics unrelated to New Valley Governorate.
4. If a question is off-topic, respond ONLY with the refusal message below.
5. Cite the section title of the source when answering (e.g., "According to [Tourism Guide]...").
6. Keep answers concise, accurate, and helpful.

Off-topic refusal (use EXACTLY):
"I'm Nakheel, and I can only help with questions about New Valley Governorate. I'm not able to answer this question."

Today's date: {date}
```

**Critical instruction for no-fabrication:**
```
IMPORTANT: If you are not sure about a fact, DO NOT fabricate it.
Say: "I don't have enough information about this in my knowledge base."
Never make up names, numbers, dates, or places.
```

### 12.4 Layer 3 — Response Guard (Post-LLM filter)

After receiving the LLM response, apply a lightweight check:

```python
def post_process_response(response_text: str, language: str) -> str:
    """
    Check for hallucination indicators:
    - Response is extremely long with no context support → warn in logs
    - Response contains non-New Valley geographic entities → flag for review
    - If response contains the refusal keywords → strip everything else
    """
    # If the model added the refusal phrase, return ONLY the refusal message
    if REFUSAL_PHRASE in response_text:
        return LOCALIZED_REFUSAL[language]
    
    # Flag suspiciously long responses with no source chunks
    # (handled in logging, not truncated — trust Layer 1 & 2)
    
    return response_text.strip()
```

### 12.5 Hallucination Prevention Checklist

| Risk | Mitigation |
|------|-----------|
| LLM invents facts not in context | Layer 1 threshold + Layer 2 explicit instruction |
| LLM answers off-domain questions | Layer 1 score guard + Layer 2 domain restriction |
| LLM ignores retrieved context | Prompt explicitly says "ONLY answer from provided context" |
| LLM goes off topic mid-response | Temperature=0.3 + Layer 3 post-filter |
| Empty retrieval results | Layer 1 catches this (empty list → not relevant) |
| Retrieval returns weakly related chunks | Reranker score threshold filters these out |

---

## 13. Chunking Strategy

### 13.1 Section Boundary Detection

Docling outputs clean Markdown with heading markers. Section boundaries are identified by:

```python
HEADING_PATTERN = re.compile(r'^(#{1,4})\s+(.+)$', re.MULTILINE)

def detect_sections(markdown: str) -> List[Section]:
    """
    Parse markdown and return sections with:
    - level (1-4)
    - title
    - content (text between this heading and the next)
    - start_line / end_line
    """
```

### 13.2 Overlap Calculation

```python
def apply_overlap(chunks: List[str], tokenizer, overlap_ratio: float = 0.20) -> List[ChunkWithOverlap]:
    """
    For each chunk[i], compute:
      overlap_tokens = int(len(tokens(chunk[i])) * overlap_ratio)
      prefix = last `overlap_tokens` tokens of chunk[i-1]
      chunk[i].text = prefix + chunk[i].original_text
      chunk[i].overlap_prev = prefix  (stored separately)
    """
```

### 13.3 Special Handling for Arabic Text

Arabic text chunking must account for:

1. **Right-to-left direction:** Token splitting must not break mid-word on Arabic characters
2. **Sentence boundaries:** Arabic sentence ends with `۔` or `.` or `؟` or `!` — all should be recognized
3. **Paragraph detection:** Use `\n\n` as paragraph boundary (same as English)
4. **Table cells in Arabic:** Tables from Docling may have Arabic cells — these should be kept together as a chunk unit

### 13.4 Chunk Validation Rules

Before accepting a chunk into the index, validate:

```python
def validate_chunk(chunk: Chunk) -> bool:
    return all([
        len(chunk.text.strip()) > 20,           # not empty/whitespace
        chunk.token_count >= MIN_CHUNK_TOKENS,   # ≥ 50 tokens
        chunk.token_count <= MAX_CHUNK_TOKENS + int(MAX_CHUNK_TOKENS * 0.20),  # soft max with overlap
        chunk.doc_id is not None,
        chunk.chunk_id is not None,
    ])
```

---

## 14. Embedding Strategy (BGE)

### 14.1 BGE-M3 — Unified Model

`BAAI/bge-m3` is a single model that produces:
- **Dense embeddings** (1024-dim) for semantic search
- **Sparse embeddings** (BM25-style, variable dim) via its internal sparse head
- **ColBERT multi-vector embeddings** (optional, for fine-grained matching — not required for this system)

Using BGE-M3 for both dense and reranking ensures **embedding space consistency**.

### 14.2 Model Loading

```python
from FlagEmbedding import BGEM3FlagModel

# Load once at application startup (singleton pattern)
embedding_model = BGEM3FlagModel(
    'BAAI/bge-m3',
    use_fp16=True,      # Half precision — faster, negligible quality loss
    device='cuda'       # or 'cpu' if no GPU
)
```

**Singleton pattern:** Load the model in FastAPI's `lifespan` context manager to avoid reload on every request.

### 14.3 Batch Embedding at Ingestion

```python
BATCH_SIZE = 32  # Tune based on GPU VRAM

def embed_chunks_batch(chunks: List[Chunk]) -> List[DenseVector]:
    texts = [chunk.text for chunk in chunks]
    batches = [texts[i:i+BATCH_SIZE] for i in range(0, len(texts), BATCH_SIZE)]
    all_embeddings = []
    for batch in batches:
        result = embedding_model.encode(
            batch,
            batch_size=BATCH_SIZE,
            max_length=512,
            return_dense=True,
            return_sparse=False,
            return_colbert_vecs=False
        )
        all_embeddings.extend(result['dense_vecs'])
    return all_embeddings
```

### 14.4 Query Embedding

```python
def embed_query(query: str) -> DenseVector:
    result = embedding_model.encode(
        [query],
        max_length=512,
        return_dense=True,
        return_sparse=True,   # Also get sparse for hybrid search
    )
    return {
        'dense': result['dense_vecs'][0],
        'sparse': result['lexical_weights'][0]  # dict: {token_id: weight}
    }
```

---

## 15. Qdrant Index Design

### 15.1 Collection Schema

Create **one collection** with both dense and sparse named vectors:

```python
from qdrant_client.models import (
    VectorParams, Distance,
    SparseVectorParams, SparseIndexParams
)

client.create_collection(
    collection_name="nakheel_chunks",
    vectors_config={
        "dense": VectorParams(
            size=1024,
            distance=Distance.COSINE,
            on_disk=False,           # Keep in RAM for speed
            hnsw_config=HnswConfigDiff(
                m=16,                # Number of edges per node
                ef_construct=200,    # Build-time quality
            )
        )
    },
    sparse_vectors_config={
        "sparse": SparseVectorParams(
            index=SparseIndexParams(on_disk=False)
        )
    },
    optimizers_config=OptimizersConfigDiff(
        indexing_threshold=10000   # Index when > 10K vectors
    )
)
```

### 15.2 Point Payload Schema

Each Qdrant point carries a **payload** (metadata) that avoids needing MongoDB lookups during search:

```json
{
  "chunk_id":       "uuid4-string",
  "doc_id":         "uuid4-string",
  "chunk_index":    42,
  "section_title":  "السياحة والآثار",
  "parent_section": "مناطق الزيارة",
  "language":       "ar",
  "page_numbers":   [12, 13],
  "token_count":    487,
  "doc_filename":   "tourism_guide_2024.pdf",
  "doc_title":      "دليل السياحة في الوادي الجديد",
  "tags":           ["tourism", "heritage"]
}
```

**Why store metadata in payload?** Avoids a MongoDB round-trip for every search result. MongoDB is only needed for full chunk text retrieval.

### 15.3 Upserting Points

```python
from qdrant_client.models import PointStruct, SparseVector

points = []
for chunk, dense_vec, sparse_vec in zip(chunks, dense_vecs, sparse_vecs):
    points.append(PointStruct(
        id=chunk.chunk_id,   # Use UUID as point ID (convert to str)
        vector={
            "dense": dense_vec.tolist(),
            "sparse": SparseVector(
                indices=list(sparse_vec.keys()),
                values=list(sparse_vec.values())
            )
        },
        payload=build_payload(chunk)
    ))

# Upsert in batches
QDRANT_BATCH_SIZE = 100
for i in range(0, len(points), QDRANT_BATCH_SIZE):
    client.upsert(
        collection_name="nakheel_chunks",
        points=points[i:i+QDRANT_BATCH_SIZE]
    )
```

### 15.4 Filtering by Language

Qdrant payload filters can restrict search to language-specific chunks:

```python
from qdrant_client.models import Filter, FieldCondition, MatchValue

# Arabic-only search (useful if user query is Arabic)
language_filter = Filter(
    must=[FieldCondition(key="language", match=MatchValue(value="ar"))]
)

# Or: allow both Arabic and mixed (recommended for most queries)
language_filter = Filter(
    should=[
        FieldCondition(key="language", match=MatchValue(value="ar")),
        FieldCondition(key="language", match=MatchValue(value="mixed")),
    ]
)
```

**Recommendation:** For Arabic queries, search across ALL languages (Arabic + English) since BGE-M3 aligns the embedding spaces cross-lingually. Only apply language filter if precision experiments show it helps.

---

## 16. MongoDB Schema Design

### 16.1 Collections

```
nakheel_db
├── documents          # one record per PDF
├── chunks             # one record per text chunk
├── sessions           # one record per chat session
├── messages           # one record per chat message
└── audit_logs         # system events (ingest, delete, errors)
```

### 16.2 Index Recommendations

```javascript
// documents collection
db.documents.createIndex({ "doc_id": 1 }, { unique: true })
db.documents.createIndex({ "status": 1 })
db.documents.createIndex({ "uploaded_at": -1 })

// chunks collection
db.chunks.createIndex({ "chunk_id": 1 }, { unique: true })
db.chunks.createIndex({ "doc_id": 1 })
db.chunks.createIndex({ "language": 1 })

// sessions collection
db.sessions.createIndex({ "session_id": 1 }, { unique: true })
db.sessions.createIndex({ "user_id": 1 })
db.sessions.createIndex({ "updated_at": 1 }, { expireAfterSeconds: 86400 })  // TTL: 24h

// messages collection
db.messages.createIndex({ "session_id": 1, "created_at": 1 })
db.messages.createIndex({ "message_id": 1 }, { unique: true })

// audit_logs collection
db.audit_logs.createIndex({ "created_at": -1 })
db.audit_logs.createIndex({ "doc_id": 1 })
```

### 16.3 Chunk Text Retrieval Pattern

Qdrant returns `chunk_id` values in results. Retrieve full text from MongoDB:

```python
async def fetch_chunks_by_ids(chunk_ids: List[str]) -> List[Chunk]:
    cursor = db.chunks.find({"chunk_id": {"$in": chunk_ids}})
    chunks = await cursor.to_list(length=len(chunk_ids))
    # Preserve order from Qdrant results
    chunk_map = {c['chunk_id']: c for c in chunks}
    return [chunk_map[cid] for cid in chunk_ids if cid in chunk_map]
```

---

## 17. Ranking & Reranking Strategy

### 17.1 Full Ranking Pipeline

```
Stage 1 — Retrieval (ANN):
  Dense search    → top-20 by cosine similarity
  Sparse search   → top-20 by BM25 score
  Combined unique → up to 40 candidates

Stage 2 — Fusion (RRF):
  Merge dense + sparse rankings using RRF (k=60)
  Output: top-10 by RRF score

Stage 3 — Reranking (Cross-encoder):
  BGE-reranker-v2-m3 scores each (query, chunk) pair
  Output: top-5 by reranker score

Stage 4 — Domain Guard:
  If top-1 reranker score < 0.35 → out-of-domain
  Else → pass to LLM
```

### 17.2 Why This Multi-Stage Pipeline

| Stage | Purpose | Justification |
|-------|---------|---------------|
| Dense ANN | Fast semantic recall | HNSW ~O(log n), sub-millisecond |
| Sparse BM25 | Exact keyword recall | Catches proper nouns, Arabic names |
| RRF Fusion | Combine rankings fairly | Score-agnostic, no normalization needed |
| Cross-encoder | High-precision reranking | More accurate but slow — only 10 candidates |
| Domain Guard | Hallucination prevention | Final safety net before LLM |

### 17.3 Score Thresholds (Tunable)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `DENSE_TOP_K` | 20 | Dense search candidate count |
| `SPARSE_TOP_K` | 20 | Sparse search candidate count |
| `RRF_K` | 60 | RRF constant |
| `RRF_TOP_N` | 10 | After fusion, pass top-N to reranker |
| `RERANKER_TOP_K` | 5 | Final chunks sent to LLM |
| `RELEVANCE_THRESHOLD` | 0.35 | Min reranker score to be considered in-domain |
| `DENSE_WEIGHT` | 0.7 | Weight of dense in weighted RRF |
| `SPARSE_WEIGHT` | 0.3 | Weight of sparse in weighted RRF |

---

## 18. Configuration & Environment Variables

### 18.1 `.env.example`

```dotenv
# Application
APP_ENV=development          # development | staging | production
APP_PORT=7000
APP_SECRET_KEY=your-secret-key
LOG_LEVEL=INFO

# MongoDB
MONGODB_URI=mongodb://localhost:27017/?directConnection=true&tls=false
MONGODB_DB_NAME=nakheel_db

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=                # leave empty for local
QDRANT_COLLECTION=nakheel_chunks
QDRANT_USE_HTTPS=false

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=1024
OPENAI_TEMPERATURE=0.3

# BGE Models
BGE_EMBEDDING_MODEL=BAAI/bge-m3
BGE_RERANKER_MODEL=BAAI/bge-reranker-v2-m3
BGE_DEVICE=cpu                # cpu | cuda | mps
BGE_USE_FP16=false

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

# Session
SESSION_MAX_MESSAGES=10
SESSION_TTL_HOURS=24
TOKEN_BUDGET_HISTORY=2000

# File Upload
MAX_FILE_SIZE_MB=50
TEMP_DIR=/tmp/nakheel
PARSED_FILE_TTL_HOURS=1

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=30
RATE_LIMIT_INJECT_PER_HOUR=10
```

### 18.2 Pydantic Settings Class

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_ENV: str = "development"
    OPENAI_API_KEY: str
    MONGODB_URI: str
    QDRANT_HOST: str = "localhost"
    # ... all other fields

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

## 19. Error Handling Strategy

### 19.1 Custom Exception Hierarchy

```python
# exceptions.py

class NakheelBaseException(Exception):
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

class DocumentNotFoundError(NakheelBaseException):
    status_code = 404
    error_code = "DOCUMENT_NOT_FOUND"

class ParseError(NakheelBaseException):
    status_code = 422
    error_code = "PARSE_ERROR"

class IndexError(NakheelBaseException):
    status_code = 500
    error_code = "INDEX_ERROR"

class SessionNotFoundError(NakheelBaseException):
    status_code = 404
    error_code = "SESSION_NOT_FOUND"

class SessionExpiredError(NakheelBaseException):
    status_code = 410
    error_code = "SESSION_EXPIRED"

class RateLimitError(NakheelBaseException):
    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"

class LLMError(NakheelBaseException):
    status_code = 502
    error_code = "LLM_ERROR"

class EmbeddingError(NakheelBaseException):
    status_code = 500
    error_code = "EMBEDDING_ERROR"
```

### 19.2 Error Response Format

All errors follow RFC 7807:
```json
{
  "error": "DOCUMENT_NOT_FOUND",
  "detail": "No document with id: 550e8400-...",
  "status": 404,
  "path": "/api/v1/documents/550e8400-...",
  "timestamp": "2025-10-01T12:00:00Z",
  "request_id": "req-abc-123"
}
```

### 19.3 Ingestion Failure Handling

If ingestion fails at any step:
1. Update document status → FAILED in MongoDB
2. Log the error step and traceback to `audit_logs`
3. Clean up any partial Qdrant points (delete by doc_id filter)
4. Do NOT leave orphaned chunks in MongoDB

---

## 20. Security Considerations

### 20.1 Authentication

- All admin endpoints (`/documents/*`) require an API key in the `X-API-Key` header
- Chat endpoints (`/chat/*`) require a valid platform JWT (forwarded from HENA-WADEENA platform)
- Health endpoint is public

```python
# api/deps.py
async def require_admin_key(x_api_key: str = Header(...)):
    if x_api_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

async def require_platform_auth(authorization: str = Header(...)):
    # Validate JWT from HENA-WADEENA platform
    ...
```

### 20.2 Input Validation

| Input | Validation |
|-------|-----------|
| PDF file | MIME type check + magic bytes check (not just extension) |
| File size | Reject > 50MB before processing |
| Message content | Max 2000 characters, strip HTML/script injection |
| doc_id / session_id | UUID4 format validation |
| Query strings | Parameterized queries only (MongoDB + Qdrant both safe by default) |

### 20.3 Rate Limiting

```python
# Per IP + per API key
/documents/inject:  10 requests/hour
/documents/parse:   20 requests/hour
/chat/messages:     30 requests/minute
```

### 20.4 Sensitive Data

- Never log full PDF content or full user message content in application logs
- Session data (messages) should be encrypted at rest in MongoDB Atlas
- OpenAI API key must never appear in logs or error responses
- Use HTTPS in all environments (including staging)

---

## 21. Performance & Scalability Notes

### 21.1 Latency Budget for `/chat/messages`

| Step | Target Latency |
|------|---------------|
| Language detection | < 10ms |
| BGE query embedding | < 100ms |
| Qdrant hybrid search | < 50ms |
| RRF fusion | < 5ms |
| BGE reranking (10 pairs) | < 200ms |
| MongoDB chunk fetch | < 30ms |
| Context window fetch | < 20ms |
| Prompt build | < 5ms |
| OpenAI API call | 800ms–2000ms |
| Post-processing + save | < 50ms |
| **Total target** | **< 2.5 seconds** |

### 21.2 BGE Model Optimization

- Use `use_fp16=True` on GPU — cuts inference time ~50%
- Pre-load models at startup — do NOT reload per request
- Use batch encoding for ingestion — never encode chunks one by one
- Cache reranker model in memory — it's ~1.1GB, load once

### 21.3 Qdrant Optimization

- Use HNSW index (already default) with `m=16, ef_construct=200`
- Increase `ef` search parameter for higher recall at query time: `search_params=SearchParams(hnsw_ef=128)`
- Use payload indexing for `doc_id` and `language` fields (for fast filtered search)
- Collection on disk vs RAM: keep in RAM for < 10M vectors

### 21.4 Async Best Practices

- Use `motor` (async MongoDB driver) everywhere — never use `pymongo` blocking calls
- Use `qdrant_client` async methods (`AsyncQdrantClient`)
- Run BGE inference in a **thread pool executor** (it's sync) to avoid blocking the event loop:

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=2)

async def embed_query_async(query: str):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, embed_query, query)
    return result
```

### 21.5 Horizontal Scaling

- Stateless FastAPI → scale with multiple instances behind a load balancer
- Shared state only in MongoDB + Qdrant (external, scalable)
- BGE model: each instance loads its own model — or consider a dedicated embedding service (Triton Inference Server)
- For very high load: extract ingestion pipeline to a Celery worker with Redis broker

---

## 22. Developer Checklist

### Phase 1 — Infrastructure Setup
- [ ] Set up MongoDB Atlas (or local replica set)
- [ ] Set up Qdrant (Docker: `docker run -p 6333:6333 qdrant/qdrant`)
- [ ] Create `.env` from `.env.example`
- [ ] Verify OpenAI API key works
- [ ] Download BGE-M3 + BGE-Reranker model weights (HuggingFace cache)
- [ ] Run `GET /health` — all services green

### Phase 2 — Ingestion Pipeline
- [ ] `core/ingestion/parser.py` — Docling PDF → Markdown works on Arabic PDF
- [ ] `core/ingestion/chunker.py` — Section chunker produces correct chunks with 20% overlap
- [ ] `core/ingestion/embedder.py` — BGE-M3 dense embeddings correct shape (1024)
- [ ] `core/ingestion/sparse_embedder.py` — BM25 sparse vectors non-empty
- [ ] `core/ingestion/indexer.py` — Qdrant upsert succeeds, MongoDB chunk insert succeeds
- [ ] `POST /documents/inject` end-to-end test with a real Arabic PDF
- [ ] `POST /documents/parse` returns valid Markdown

### Phase 3 — Retrieval Pipeline
- [ ] `core/retrieval/hybrid_search.py` — dense + sparse search returns results
- [ ] `core/retrieval/rrf_fusion.py` — RRF correctly merges + deduplicates
- [ ] `core/retrieval/reranker.py` — Reranker scores are sensible (higher for more relevant)
- [ ] Test retrieval with Arabic query → Arabic chunks returned
- [ ] Test retrieval with English query → correct English chunks returned
- [ ] Domain guard: irrelevant query returns score < threshold

### Phase 4 — Generation Pipeline
- [ ] `core/generation/domain_guard.py` — correctly blocks off-domain queries
- [ ] `core/generation/prompt_builder.py` — Egyptian Arabic prompt is natural
- [ ] `core/generation/llm_client.py` — OpenAI returns grounded response
- [ ] Anti-hallucination: test with a question the documents don't answer
- [ ] `core/session/context_window.py` — sliding window correctly limits to 10 messages

### Phase 5 — API Layer
- [ ] All 8+ endpoints return correct HTTP status codes
- [ ] Error responses follow RFC 7807 format
- [ ] Rate limiting works
- [ ] Auth middleware blocks unauthorized requests
- [ ] `DELETE /documents/{doc_id}` cleans up both Qdrant AND MongoDB

### Phase 6 — Language & Dialect
- [ ] Language detection correctly classifies Egyptian Arabic
- [ ] System prompt switches dialect based on detected language
- [ ] Mixed-language query handled gracefully
- [ ] Arabic refusal message is natural and friendly

### Phase 7 — Quality Assurance
- [ ] Unit tests for chunker edge cases (very short section, very long section)
- [ ] Unit tests for RRF fusion (tie-breaking, empty inputs)
- [ ] Integration test: full inject → query → answer pipeline
- [ ] Load test: 10 concurrent chat requests under 2.5s
- [ ] Hallucination test suite: 20+ off-domain questions, all correctly refused
- [ ] Arabic accuracy test: 20+ Arabic questions, answers verified by native speaker

---

## Appendix A — Suggested Additional Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /documents/{doc_id}/chunks` | GET | List all chunks of a document (admin audit) |
| `POST /chat/sessions/{id}/feedback` | POST | User thumbs up/down on a message |
| `GET /analytics/queries` | GET | Most common queries (admin dashboard) |
| `GET /analytics/documents` | GET | Document usage stats |
| `POST /admin/reindex/{doc_id}` | POST | Force re-embed and re-index a document |
| `GET /admin/qdrant/stats` | GET | Qdrant collection stats |

---

## Appendix B — Prompt Templates (Full)

### B.1 System Prompt — English

```
You are Nakheel (نخيل), the official intelligent assistant for the HENA-WADEENA platform.
Your sole purpose is to answer questions about New Valley Governorate (Wadi El Gedid / محافظة الوادي الجديد) in Egypt.

RULES (non-negotiable):
1. Answer ONLY based on the provided context. Never invent or assume information.
2. If context is insufficient, say: "I don't have enough information about this in my knowledge base."
3. If the question is unrelated to New Valley Governorate, respond ONLY with:
   "I'm Nakheel, and I can only help with questions about New Valley Governorate."
4. When answering, reference the source section when possible: "According to [Section Title]..."
5. Be concise, friendly, and accurate.
6. Never discuss politics, religion controversially, or sensitive topics beyond your domain.

Today's date: {current_date}
```

### B.2 System Prompt — Egyptian Arabic

```
انت نخيل، المساعد الذكي الرسمي لمنصة هنا وادينا.
شغلتك الوحيدة إنك تجاوب على الأسئلة المتعلقة بمحافظة الوادي الجديد في مصر.

القواعد (مش قابلة للتغيير):
١. جاوب بس على أساس المعلومات اللي متوفرة في السياق. متختلقش معلومات.
٢. لو المعلومات مش كافية، قول: "معنديش معلومات كافية عن ده في قاعدة بياناتي."
٣. لو السؤال مش عن الوادي الجديد، قول بس:
   "أنا نخيل وبتكلم بس في حاجات محافظة الوادي الجديد. مش قادر أساعدك في ده."
٤. لما تجاوب، اذكر المصدر لو ممكن: "حسب [اسم القسم]..."
٥. كون ودود ومختصر ودقيق.

تاريخ النهارده: {current_date}
```

### B.3 User Prompt Template

```
Based on the following information about New Valley Governorate:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{formatted_context_chunks}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: {user_question}
```

---

## Appendix C — Glossary

| Term | Definition |
|------|-----------|
| RAG | Retrieval-Augmented Generation — LLM answers grounded in retrieved documents |
| BGE-M3 | BAAI General Embedding — Multilingual model for dense + sparse embeddings |
| BM25 | Best Match 25 — Classical probabilistic sparse retrieval algorithm |
| RRF | Reciprocal Rank Fusion — Score-agnostic method to merge ranked lists |
| HNSW | Hierarchical Navigable Small World — ANN graph index used by Qdrant |
| Chunk | A fixed-size text segment from a document, used as retrieval unit |
| Overlap | Shared text between consecutive chunks to preserve context continuity |
| Reranker | Cross-encoder model that scores (query, chunk) pairs for precision |
| Domain Guard | Module that determines if a query is within Nakheel's knowledge domain |
| Session | A stateful conversation unit tracking 10-message context window |
| Anti-Hallucination | Set of techniques preventing the LLM from fabricating information |
| Docling | IBM open-source PDF parsing library producing structured Markdown |
| Motor | Async Python driver for MongoDB |
| `ar-eg` | Egyptian Arabic dialect identifier |
| TTL | Time To Live — automatic document expiry in MongoDB |

---

*Document prepared for Nakheel RAG System — HENA-WADEENA Platform*
*All configurations are starting points — tune thresholds based on real-data experiments*
