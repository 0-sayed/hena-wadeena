# Architecture Assessment — Hena Wadeena

> Evaluates architecture options and infrastructure choices for the Hena Wadeena MVP, establishing the 6 microservices architecture as the target.

---

## 1. Service Boundaries

### Domain Service List

| # | Service | Core Responsibilities | Data Owned | Endpoints | PostGIS | Dev Owner |
|---|---------|----------------------|-----------|-----------|---------|-----------|
| 1 | **Identity Service** (:8001) | Auth (JWT access+refresh, OTP), user profiles, KYC, role assignment, notifications, saved items, audit events | `users`, `user_kyc`, `user_preferences`, `saved_items`, `auth_tokens`, `otp_codes`, `audit_events`, `notifications` (identity schema) | 20 | No | — |
| 2 | **Market Service** (:8002) | Listings CRUD, price index by area, business directory, reviews, featured listings, investment opportunity listings, EOI/applications | `listings`, `price_snapshots`, `business_directory`, `reviews`, `investment_opportunities`, `investment_applications` (market schema) | 21 | Yes | — |
| 3 | **Guide-Booking Service** (:8003) | Guide profiles, tour packages, booking state machine, guide availability, reviews | `guides`, `tour_packages`, `bookings`, `guide_availability`, `reviews` (guide_booking schema) | 20 | Yes | — |
| 4 | **Map Service** (:8004) | POI CRUD + moderation, simplified carpooling (post/find rides), routes | `points_of_interest`, `carpool_rides`, `carpool_passengers` (map schema) | 8 | Yes | — |
| 5 | **AI Service** (:8005) | RAG chatbot, knowledge base management, semantic search | `chat_sessions`, `kb_documents` (ai schema); vector embeddings (Qdrant) | 6 | No | — |

> **Note:** The proposal names **Wadi Exchange** as a core module — a B2B commodity price index (dates, olives) and supplier directory. The admin-curated MVP is handled by Market Service (T10); full B2B matching is deferred. Investment functionality (opportunities, applications) is owned by Market Service — there is no standalone Investment Service.

---

## 2. Architecture Decision: 6 Microservices

Architecture: **6 microservices** (5 domain services + Nginx gateway) with Docker Compose deployment and pnpm workspaces monorepo.

### Rationale

| Signal | Evidence |
|--------|----------|
| Team size | 4 developers — small but sufficient for microservices with Docker Compose (no K8s overhead). |
| Natural separation | The AI service requires Python (FastAPI), making it a natural separate process. This precedent extends cleanly to the NestJS services. |
| Per-service schemas | Each service owns its schema (identity, market, guide_booking, map, ai) within a single database (wadeena_db). Each service uses `search_path` for isolation. Clean data boundaries from day one. |
| Monorepo tooling | pnpm workspaces (NestJS services) + uv (Python AI service) provide shared dependency management without deployment coupling. |
| Docker Compose | Single `docker-compose.yml` keeps operational complexity manageable for a small team while maintaining service isolation. |
| PostGIS requirements | Market, Guide-Booking, and Map services require PostGIS; Identity and AI do not. PostGIS and pg_trgm enabled at database level; schemas isolate service data. |

### Extraction Candidates (Post-MVP)

Extract or scale independently only when there is a **measured need**:

- **AI Service** — already separate (Python); may need GPU scaling independently.
- **Payment Service** — deferred entirely; when added, PCI isolation is a natural microservice boundary.
- **Real-time carpool (WebSocket)** — deferred; when added, may warrant its own process for connection scaling.

---

## 3. MVP Simplifications

Items deferred or dropped from the MVP scope. These are valid features for later phases but not required at launch.

| Feature / Service | MVP Approach |
|------------------|-------------|
| **Payment integration** (Paymob/Fawry) | Deferred — no real transactions until the platform has users. Booking state machine operates without payment gates. |
| **Analytics dashboard** | Deferred — no KPI definitions or dashboard design. Basic admin queries suffice. |
| **Real-time carpool** (WebSocket) | Deferred — simplified carpool (post/find rides) in Map Service (T21). Real-time driver tracking is post-MVP. |
| **SMS OTP** | Deferred — email-based OTP for MVP. |
| **Google OAuth** | Deferred — @node-rs/argon2 (Argon2id) password hashing for MVP. |
| **Push notifications** (FCM) | Deferred — no mobile app at MVP. In-app + email notifications via Identity Service. |
| **Subscription billing** | Deferred — no payment infrastructure at MVP. |
| **Full B2B matching** (Wadi Exchange) | Deferred — admin-curated price index and business directory via Market Service (T10). |
| **Mobile app** (React Native) | Deferred — web-only for MVP. |
| **Offline mode** | Deferred — no service worker or sync strategy designed. |
| **Price prediction model** (AI) | Deferred — no historical price data exists to train on. |
| **Recommendation engine** (AI) | Deferred — no behavioral data to learn from. |

> **Note:** Offline access ("smart interaction under weak network conditions") is a differentiating feature from the proposal. It has no architectural design yet and must be scoped for Phase 2.

---

## 4. MVP Core Capabilities

The core user problem: **information about New Valley is fragmented and untrustworthy.** The MVP solves exactly that.

### Minimum Viable Capabilities

| Capability | Why It Is Core |
|-----------|---------------|
| **Auth (register, login, JWT, 8 roles)** | Every other feature gates on identity. |
| **Listings (places, accommodation, services)** | The primary information artifact. Tourists and students cannot use the product without it. |
| **Tourist guide content + guide booking** | The tourism use case is the most demonstrable; curated attraction data with geo-coordinates. Booking state machine (T15) enables real transactions. |
| **Investment opportunity board** | The investor persona is the revenue-enabling persona; EOI/application workflow (T17) provides structured deal flow. Owned by Market Service. |
| **RAG chatbot ("Imagine")** | The stated AI differentiator. A single chatbot endpoint backed by Qdrant over seeded content, powered by Gemini Flash Lite 3.1. |
| **Unified search** | PostgreSQL full-text + pg_trgm across all content types. |
| **Admin content management** | Per-service admin endpoints for add/edit/verify operations. |
| **Map view with POIs** | POI CRUD with PostGIS coordinates. High-value demo feature. |
| **KYC verification** | KYC workflow (T09) for guides, investors, merchants — required for trust. |
| **Notifications** | In-app + email notifications via Identity Service (T13) — required for booking and review flows. |
| **Reviews** | Review system for Market (T14) and Guide-Booking (T18) — required for trust and content quality. |
| **Simplified carpool** | Post/find rides in Map Service (T21) — addresses core transport pain point without WebSocket complexity. |
| **Seeded data** | ~100 seeded documents for chatbot KB, seeded listings with coordinates. |

---

## 5. Inter-Service Communication

### Patterns

| Pattern | Where Used | Implementation |
|---------|-----------|---------------|
| **REST over internal Docker network** | Service-to-service sync calls (e.g., Guide-Booking → Identity for user data) | Internal endpoints under `/internal/*` routes, blocked by Nginx at the gateway level. |
| **Redis Streams (async events)** | All domain events (user.registered, listing.created, booking.confirmed, etc.) | XADD/XREADGROUP with consumer groups. Each service has a dedicated consumer group. |

### Redis Key Prefix Convention

| Service | Prefix |
|---------|--------|
| Identity | `id:` |
| Market | `mkt:` |
| Guide-Booking | `gb:` |
| Map | `map:` |
| AI | `ai:` |
| Gateway | `gw:` |

Key prefixes are enforced at the client library level. Each service's Redis client is configured with its prefix to prevent cross-service key collisions on the shared Redis 7 instance.

### Redis Streams Consumer Group Pattern

Each service creates a consumer group for each stream it subscribes to. Events are acknowledged (XACK) after successful processing. Failed events remain pending and can be reclaimed after a timeout. This provides at-least-once delivery semantics without a dedicated message broker.

### Anti-Patterns to Avoid

**Synchronous recommendation calls on the read path:**
Calling the AI Service synchronously for personalised recommendations on every guide listing request will increase p99 latency significantly. Recommendation engines are inherently slow (vector similarity search + reranking). This should be a pre-computed, asynchronously refreshed result — not a blocking call.

**Search index freshness:**
PostgreSQL pg_trgm indexes are updated transactionally with writes, so search results are always consistent. Semantic search via Qdrant is updated asynchronously via Redis Streams events (listing.created, listing.verified, poi.approved, opportunity.published). A `kb.rebuild.requested` event triggers a full re-index when needed.

---

## 6. Infrastructure Decisions

| Technology | Purpose | MVP Status | Verdict |
|-----------|---------|-----------|---------|
| **PostgreSQL 16 + PostGIS** | Primary database (single database with 5 schemas: identity, market, guide_booking, map, ai) | Yes | **Adopted** — all services use PostgreSQL. Single database (wadeena_db) with per-service schemas. PostGIS and pg_trgm enabled at database level. |
| **Drizzle ORM** | TypeScript ORM for NestJS services | Yes | **Adopted** — type-safe schema definitions and migrations. |
| **Zod + nestjs-zod + drizzle-zod** | Validation — single source of truth for schema, DTO, and validation | Yes | **Adopted** — Zod schemas drive both Drizzle table definitions and NestJS request validation. Eliminates duplicated type definitions. |
| **@node-rs/argon2 (Argon2id)** | Password hashing — Rust/NAPI bindings for Argon2id | Yes | **Adopted** — superior memory-hard hashing algorithm; NAPI bindings avoid bcrypt's native compile issues. |
| **uuidv7 (npm)** | UUID v7 primary keys — time-sortable, monotonic | Yes | **Adopted** — all primary keys use UUID v7 for time-ordering benefits and index locality. |
| **nestjs-pino + pino-http** | Structured logging — JSON stdout, async writes | Yes | **Adopted** — JSON structured logs to stdout; compatible with log aggregators. Async writes avoid blocking the event loop. |
| **Resend** | Transactional email (OTP, notifications, booking confirmations) | Yes | **Adopted** — confirmed provider; free tier 3,000 emails/month permanent. |
| **Redis 7** | Cache, session store, rate limiting, async events (Streams) | Yes | **Adopted** — shared instance with key-prefix isolation per service. |
| **@nestjs/throttler + Redis storage** | Per-user/per-route rate limiting (application layer) | Yes | **Adopted** — complements Nginx IP-level rate limiting with authenticated per-user and per-route limits stored in Redis. |
| **@nestjs/terminus + Docker HEALTHCHECK** | Health checks for all services | Yes | **Adopted** — liveness and readiness endpoints; Docker HEALTHCHECK directives in each service Dockerfile. |
| **Qdrant** | Vector store for RAG embeddings | Yes | **Adopted** — lightweight, runs in Docker, powers semantic search. |
| **Gemini Flash Lite 3.1** | LLM for RAG chatbot | Yes | **Adopted** — powers the "Imagine" chatbot. |
| **Gemini Embedding 001** | Text embeddings for vector search | Yes | **Adopted** — generates embeddings for Qdrant. |
| **AWS S3** | File/document storage (KYC docs, images) | Yes | **Adopted** — presigned URLs for upload/download. |
| **Nginx** | API gateway — IP-level rate limiting, SSL termination, route proxying, blocks /internal/* routes | Yes | **Adopted** — first line of rate limiting and routing. |
| **Docker + Docker Compose** | Containerization and orchestration | Yes | **Adopted** — single docker-compose.yml for all services. Images: node:22-slim (runtime), node:22 (build stage), python:3.12-slim (AI service). |
| **GitHub Actions** | CI/CD pipeline | Yes | **Adopted** — automated testing and deployment. |
| **Vitest + Supertest** | Testing (NestJS services) | Yes | **Adopted** — unit and integration testing. |
| **pytest** | Testing (Python AI service) | Yes | **Adopted** — unit and integration testing. |
| **pnpm workspaces** | Monorepo management (NestJS) | Yes | **Adopted** — shared dependency management across NestJS services. |
| **uv** | Python package management (AI service) | Yes | **Adopted** — fast, reliable Python dependency management. |
| **NestJS 11** | Backend framework (4 NestJS domain services) | Yes | **Adopted** — TypeScript, modular, well-documented. |
| **FastAPI** | Backend framework (AI service) | Yes | **Adopted** — Python, async, ideal for ML workloads. |
| **Node.js 22 LTS** | Runtime | Yes | **Adopted** — latest LTS, required by NestJS 11. |
| **React + React Router v7** | Frontend SPA | Yes | **Adopted** — existing frontend with React Router v7 for routing. |
| **Google Maps API** | Geo-coding, map tiles | Yes (limited) | **Adopted** — embed usage for pinning POIs; full directions API deferred. |
| **PostgreSQL pg_trgm** | Full-text and fuzzy search | Yes | **Adopted** — replaces Elasticsearch/Meilisearch for MVP. |
| **MongoDB** | Document store | — | **Dropped** — replaced by PostgreSQL 16 for all services. |
| **Elasticsearch** | Full-text search | — | **Dropped** — replaced by PostgreSQL pg_trgm. |
| **Meilisearch** | Alternative search engine | — | **Dropped** — replaced by PostgreSQL pg_trgm. |
| **RabbitMQ** | Message broker | — | **Dropped** — replaced by Redis Streams. |
| **Kafka** | Message streaming | — | **Dropped** — replaced by Redis Streams; Kafka overhead is not justified for MVP scale. |
| **MinIO** | Self-hosted object storage | — | **Dropped** — replaced by AWS S3. |
| **Kong** | API gateway | — | **Dropped** — replaced by Nginx. |
| **OpenAI API / gpt-4o-mini** | LLM | — | **Dropped** — replaced by Gemini Flash Lite 3.1. |
| **Ollama** | Local LLM fallback | — | **Dropped** — single LLM provider (Gemini) for MVP. |
| **MySQL** | Relational database | — | **Dropped** — PostgreSQL selected. |
| **Keycloak** | Identity provider | — | **Dropped** — app-level JWT is sufficient. |
| **Soketi** | WebSocket server | — | **Deferred** — real-time carpool tracking is post-MVP. |
| **Firebase Cloud Messaging** | Push notifications | — | **Deferred** — no mobile app at MVP. |
| **Prometheus + Grafana + Loki** | Observability stack | — | **Deferred** — structured logging to stdout for MVP. |
| **Kubernetes / K3s** | Container orchestration | — | **Deferred** — Docker Compose is sufficient for MVP. |
| **ArgoCD** | GitOps CD | — | **Dropped** — GitHub Actions is the CI/CD solution. |
| **React Native / Expo** | Mobile app | — | **Deferred** — web-only for MVP. |
| **Celery** | Distributed task queue | — | **Dropped** — not needed with Redis Streams. |

> **Monetary values:** All monetary amounts are stored as integers in piasters (smallest currency unit). Never use float, real, or decimal types for money.

---

## Known Gaps

- **Wadi Exchange full B2B model:** No schema for full B2B supplier matching workflow or commodity tracking beyond admin-curated price index.
- **Offline access design:** No service worker, local storage, or sync strategy defined.
- **Arabic transliteration rules:** No mapping rules or library selection documented for search.
- **Recommendation pre-computation pipeline:** The AI recommendation path needs an async pre-computation and cache strategy.
- **Data seeding strategy:** MVP chatbot requires ~100 seeded documents and listings require seeded coordinates. No data collection or verification plan is defined.
- **Carpooling legal compliance:** Ride-sharing has legal implications in Egypt. No regulatory assessment exists.
