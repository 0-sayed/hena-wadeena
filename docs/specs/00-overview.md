# Hena Wadeena — System Overview & Quick-Reference Map

> Executive summary of the platform scope, module inventory, event catalog, and known gaps for the NestJS rebuild.

---

## 1. Platform Summary

Hena Wadeena is a unified regional digital portal for New Valley Governorate (Al-Kharga, Al-Dakhla, Al-Farafra, Baris, Balat) — Egypt's largest but least-digitized governorate. The platform serves as a single trusted source for information, services, and economic activity in the region.

### Core Modules

| Module                        | What it is                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Wadeena Connects You          | Bus + carpooling coordination (access to and within the valley)                             |
| Wadi Exchange                 | Seasonal crop/product price index + B2B supplier matching (farmers → factories → merchants) |
| Investment Portal             | Startup/youth ideas matched to external investors                                           |
| Al-Wahati Guide (Oasis Guide) | Verified accommodation + on-demand local guide services                                     |
| Imagine Chatbot               | AI assistant in local dialect for in-app queries                                            |

### Target Users (Four Pillars)

- **Tourists** — trip planning, transport, guides, accommodation
- **Students / newcomers** — housing, daily services, carpooling
- **Investors / merchants** — B2B, pricing transparency, deal flow
- **Local citizens** — access to services, local economy

### Business Model

B2B commissions, featured listing subscriptions, premium services (booking, guides, transport), data/report packages for investors. No pricing figures specified.

### Phase Plan

- **Phase 1 MVP:** Auth, listings, tourist guide, AI chatbot, investment board, guide booking, POIs + simplified carpool, admin endpoints, unified search (pg_trgm), seeded data, KYC, notifications, reviews — PostgreSQL 16 + PostGIS (per-service schemas) + Redis 7
- **Phase 2:** Payment integration (Paymob/Fawry), mobile app, real-time carpool (WebSocket), Google OAuth, push notifications (FCM), subscription billing
- **Phase 3:** Advanced recommendations, government integration, geographic expansion, full B2B matching (Wadi Exchange), analytics dashboard

---

## 2. Architecture

**Architecture pattern:** 6 microservices — Identity, Market, Guide-Booking, Map, AI (Python), plus an Nginx gateway. Each NestJS service runs independently in Docker, communicating via REST (internal Docker network) for sync calls and Redis Streams for async events. The AI service is a standalone FastAPI/Python service. Investment functionality (opportunities, applications) is merged into the Market Service. **Team size: 4 developers** (NestJS × 3, Python/AI × 1).

### Service Decomposition

| Service | Port | Framework | Responsibilities | Database |
|---------|------|-----------|-----------------|----------|
| Identity Service | :8001 | NestJS | Auth + Users, KYC + Roles, Notifications, Saved Items | identity schema |
| Market Service | :8002 | NestJS | Listings, Price Index, Business Directory, Reviews, Investment Opportunities, Investment Applications | market schema (PostGIS) |
| Guide-Booking Service | :8003 | NestJS | Guides, Bookings, Packages, Reviews | guide_booking schema (PostGIS) |
| Map Service | :8004 | NestJS | POIs, Carpool, Routes | map schema (PostGIS) |
| AI Service | :8005 | FastAPI | RAG Chat, KB Management, Semantic Search | ai schema + Qdrant |

### Gateway

- **Nginx Gateway** (:8000) — SSL termination, rate limiting, route proxying, blocks `/internal/*` routes

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS |
| Framework | NestJS 11 (backend) / FastAPI (AI) |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 + PostGIS (single database with 5 schemas) |
| Cache/Events | Redis 7 (shared, key-prefix isolated; Streams for async events) |
| Vector DB | Qdrant |
| LLM | Gemini Flash Lite 3.1 |
| Embeddings | Gemini Embedding 001 |
| Auth | JWT (access + refresh tokens) |
| File Storage | AWS S3 |
| API Gateway | Nginx |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Testing | Vitest + Supertest (NestJS) / pytest (Python) |
| Monorepo | pnpm workspaces (NestJS, frontend at `apps/web/`) + uv (Python AI service) |
| Search | PostgreSQL full-text + pg_trgm |
| Frontend | React (monorepo: `apps/web/`) |
| RBAC | 8 roles: tourist, resident, student, merchant, driver, guide, investor, admin |

### Domain Model Assets

- **Data models:** Complete schemas for all services — field names, types, indexes. All PKs: UUID v7, all timestamps: timestamptz, geo: PostGIS geometry(Point, 4326), soft deletes: deleted_at.
- **API contract:** Complete endpoint tables for all 5 domain services — with HTTP methods, paths, auth requirements, response types.
- **Business domain constants:** UserRole (8 roles), ListingCategory, InvestmentSector, GuideType, Area (5 cities with coordinates) — all defined.
- **RBAC matrix:** 8-role taxonomy with Role x Service Action matrix.
- **Cache key design:** Explicit Redis key prefixes per service: id:, mkt:, gb:, map:, ai:, gw:

---

## 3. System Map

| Service | What it does | Design Status |
|---------|-------------|---------------|
| **Nginx Gateway** (:8000) | SSL termination, rate limiting, route proxying, blocks /internal/* | Designed (T01) |
| **Identity Service** (:8001) | Auth, user profiles, KYC, roles, notifications, saved items | Designed (T02–T09, T13) |
| **Market Service** (:8002) | Listings, price index, business directory, reviews, investment opportunities, investment applications | Designed (T10, T14, T17) |
| **Guide-Booking Service** (:8003) | Guide profiles, tour packages, booking state machine, reviews | Designed (T11, T15, T18) |
| **Map Service** (:8004) | POIs, simplified carpool, routes | Designed (T21) |
| **AI Service** (:8005) | RAG chatbot, knowledge base management, semantic search | Designed (T23–T26) |

### Endpoint Inventory Summary

| Service | Endpoints (approx.) |
|---------|-------------------|
| Identity (auth + users) | 20 |
| Market (listings + exchange + investment) | 21 |
| Guide-Booking | 20 |
| Map (POI + carpool) | 8 |
| AI (chatbot + KB) | 6 |
| **Total** | **127+** |

> The authoritative endpoint contract is in `03-api-surface.md`.

---

## 4. Event Catalog (Key Domain Events)

All events use **Redis Streams** with consumer groups (XADD/XREADGROUP). Redis key prefix convention: id:, mkt:, gb:, map:, ai:, gw:

| Event | Emitter | Consumers |
|-------|---------|-----------|
| `user.registered` | Identity Service | AI Service (personalization) |
| `listing.created` | Market Service | AI Service (KB update) |
| `listing.verified` | Market Service | AI Service (KB update) |
| `booking.requested` | Guide-Booking Service | Identity Service (notifications) |
| `booking.confirmed` | Guide-Booking Service | Identity Service (notifications) |
| `booking.cancelled` | Guide-Booking Service | Identity Service (notifications) |
| `booking.completed` | Guide-Booking Service | Identity Service (notifications) |
| `review.submitted` | Market / Guide-Booking Service | Identity Service (notifications) |
| `opportunity.published` | Market Service | AI Service (KB update) |
| `poi.approved` | Map Service | AI Service (KB update) |
| `kb.rebuild.requested` | Admin (any service) | AI Service (full re-index) |

---

## 5. Proposal-to-Design Gap Analysis

| Proposal Feature | Architecture Status | Flag |
|-----------------|--------------------|----|
| Wadi Exchange (B2B crop price + supplier matching) | Admin-curated MVP via Market Service (T10); full B2B matching deferred | Partial — MVP scoped |
| Carpooling system | Simplified carpool designed in Map Service (T21); real-time WebSocket deferred | Designed (simplified) |
| Bus company integration (Wadeena Connects You) | Not present in architecture | Missing |
| Investment deal workflow (startup → investor matching) | EOI/application workflow designed, merged into Market Service (T17) | Designed |
| Offline / weak-network mode | No technical design | Not designed |
| Government / institutional API integration | Listed as future capability; no technical spec | Not designed |
| Content moderation (reviews, listings) | Admin verify endpoints exist per service; no automated moderation pipeline | Under-designed |
| Analytics and KPI dashboards | Deferred | Deferred |
| Mobile application | Deferred; no React Native design | Deferred |
| Verified housing for students | No dedicated housing flow; folded into generic listings | Under-designed |
| Local guide booking system | Fully designed with state machine (T15) | Designed |
| Partner / provider governance dashboard | Not modeled | Missing |

---

## 6. Critical Flags

1. **Wadi Exchange is the most differentiated feature and partially designed.** T10 covers an admin-curated MVP (price index, business directory), but the full B2B supplier matching workflow is deferred. No dedicated entity model for commodity tracking or supplier profiles exists beyond listings.

2. **The data model is the most complete asset.** Field names, indexes, and relationships are all specified. Use it as the domain model source when defining NestJS entities and DTOs.

3. **Analytics is deferred.** Do not block other work on it, but do not promise it for any early milestone.

---

## All Decisions Resolved

All architecture and technology decisions have been locked. See `initial-roadmap/roadmap.md` for the full rationale. Summary of resolved items:

- **Database:** PostgreSQL 16 + PostGIS (single database, per-service schemas)
- **Search:** PostgreSQL full-text + pg_trgm
- **Message broker:** Redis Streams with consumer groups
- **Frontend:** React (monorepo: `apps/web/`)
- **RBAC:** 8 roles confirmed (tourist, resident, student, merchant, driver, guide, investor, admin)
- **Embeddings:** Gemini Embedding 001
- **LLM:** Gemini Flash Lite 3.1
- **Storage:** AWS S3
- **API Gateway:** Nginx
- **ORM:** Drizzle ORM
- **Event reconciliation:** Payments deferred; booking events owned by Guide-Booking Service

---

## Known Gaps

- **Wadi Exchange full B2B:** No schema for full B2B supplier matching workflow, commodity tracking beyond price index, or supplier profiles beyond business directory.
- **Bus company integration:** No design of any kind.
- **Analytics service:** No data model, no KPI definitions, no dashboard design. Deferred.
- **Content moderation:** No automated moderation pipeline or policy framework beyond admin verify endpoints.
- **Offline/weak-network mode:** No technical design for offline map tile caching or data sync.
- **Mobile application:** No React Native architecture or design. Deferred.
- **Partner governance dashboard:** No design for partner/provider onboarding and data management.
- **AI chatbot prompt strategy:** No prompt engineering or conversation design documentation.
- **Recommendation engine:** Listed as capability, no design.
- **Arabic transliteration rules:** No mapping rules or library selection documented for search.
- **Data seeding strategy:** MVP chatbot requires seeded documents and listings require seeded coordinates. No data collection or verification plan is defined.
