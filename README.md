# هنا وادينا — Hena Wadeena

Unified digital platform for New Valley Governorate, Egypt — connecting tourists, residents, merchants, guides, investors, and government in a single Arabic-first experience.

## What it does

- **Tourist Guide** — attractions, coordinates, photos, tips across the New Valley
- **Market Directory** — listings, price index, business directory, investment opportunities
- **Guide Booking** — request, confirm, and manage tours with local guides
- **AI Concierge** — RAG chatbot in Egyptian Arabic, backed by a curated knowledge base
- **Carpool + POIs** — community rides and points of interest on an interactive map
- **Unified Search** — full-text Arabic search across all services

## Tech Stack

| Layer                | Technology                                   |
| -------------------- | -------------------------------------------- |
| Backend (4 services) | NestJS 11, Node.js 22 LTS                    |
| AI Service           | FastAPI, Python 3.12                         |
| Database             | PostgreSQL 16 + PostGIS                      |
| Cache / Events       | Redis 7 (Streams)                            |
| Vector DB            | Qdrant                                       |
| LLM / Embeddings     | Gemini Flash Lite 3.1 / Gemini Embedding 001 |
| Frontend             | React, React Router v7, TanStack Query       |
| ORM                  | Drizzle ORM                                  |
| API Gateway          | Nginx                                        |
| Monorepo             | pnpm workspaces (NestJS) + uv (Python)       |
| Infrastructure       | Docker Compose, AWS                          |

## Getting Started

### Prerequisites

- Node.js 22 LTS (`nvm use`)
- pnpm 9+
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- Docker + Docker Compose

### Setup

```bash
# 1. Install Node dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Start infrastructure (Postgres, Redis, Qdrant)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis qdrant

# 4. Run all backend services in dev mode
pnpm dev
```

### AI Service (Python)

```bash
cd services/ai
uv sync
uv run uvicorn src.main:app --reload --port 8005
```

## Project Structure

```
hena-wadeena/
├── apps/web/              # React frontend (@hena-wadeena/web)  [planned]
├── packages/
│   ├── types/             # @hena-wadeena/types — shared TypeScript types
│   └── nest-common/       # @hena-wadeena/nest-common — shared NestJS modules
├── services/
│   ├── identity/          # Auth, users, KYC, notifications  :8001
│   ├── market/            # Listings, price index, investment :8002
│   ├── guide-booking/     # Guides, tours, bookings          :8003
│   ├── map/               # POIs, carpool                    :8004
│   └── ai/                # RAG chatbot (Python/FastAPI)     :8005
├── gateway/               # Nginx config                     :8000
└── docs/                  # Architecture + API specs
```

## License

Apache 2.0 — see [LICENSE](./LICENSE).
