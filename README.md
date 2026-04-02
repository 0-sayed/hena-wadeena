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
| Document Store       | MongoDB 7 (AI service only)                  |
| Cache / Events       | Redis 7 (Streams)                            |
| Vector DB            | Qdrant                                       |
| LLM / Embeddings     | OpenAI gpt-4o-mini / text-embedding-3-small |
| Frontend             | React 18, Vite, React Router v7              |
| UI Components        | Radix UI, Tailwind CSS, shadcn/ui            |
| State Management     | TanStack Query v5                            |
| Maps                 | Leaflet, React Leaflet                       |
| ORM                  | Drizzle ORM                                  |
| API Gateway          | Nginx                                        |
| Monorepo             | pnpm workspaces (NestJS) + uv (Python)       |
| Infrastructure       | Docker Compose, GitHub Actions + Contabo VPS |

## Getting Started

### Prerequisites

- Node.js 22 LTS (`nvm use`)
- pnpm 9+
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- Docker + Docker Compose

### Quick Start (Recommended)

```bash
# 1. Install dependencies and build shared packages
make setup

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials (DATABASE_URL, REDIS_PASSWORD, JWT_SECRET, etc.)

# 3. Start infrastructure (Postgres, Redis, Qdrant)
make infra

# 4. Run backend services (all 4 NestJS services with hot-reload)
make dev

# 5. Run frontend (in a new terminal)
make web

# 6. (Optional) Run AI service (in a new terminal)
make ai
```

### Manual Commands (Alternative)

If you prefer verbose commands or need fine-grained control:

```bash
# Setup
pnpm install
pnpm --filter @hena-wadeena/types build
pnpm --filter @hena-wadeena/nest-common build

# Infrastructure
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis qdrant

# Backend services (all 4)
pnpm dev

# Or run individual services
pnpm --filter @hena-wadeena/identity dev
pnpm --filter @hena-wadeena/market dev
pnpm --filter @hena-wadeena/guide-booking dev
pnpm --filter @hena-wadeena/map dev

# Frontend
pnpm --filter @hena-wadeena/web dev

# AI service
cd services/ai && uv sync && uv run uvicorn nakheel.main:app --reload --port 8005
```

### Makefile Commands Reference

```bash
make help          # Show all available commands
make setup         # Install deps + build shared packages
make infra         # Start postgres, redis, qdrant
make infra-down    # Stop infrastructure
make dev           # Run all NestJS services (hot-reload)
make web           # Run React frontend (hot-reload)
make ai            # Run Python AI service (hot-reload)
make health        # Check all services are running
make seed          # Seed all databases (essential layer)
make build         # Build all packages + services
make test          # Run all tests
make validate      # lint + typecheck + test + knip + audit + build
make logs          # Tail infrastructure logs
make clean         # Stop containers, remove volumes + dist
```

## Verify Everything is Running

After starting the services, check their health:

```bash
make health
```

Expected output:
```
── identity      OK
── market        OK
── guide-booking OK
── map           OK
── ai            OK
```

## Production Deployment (Docker)

```bash
# Infrastructure only (default - for local development)
docker compose up -d
# or: make infra

# Full backend stack (production profile)
COMPOSE_PROFILES=prod docker compose up -d

# With AI service
COMPOSE_PROFILES=prod,ai docker compose up -d
```

## Project Structure

```
hena-wadeena/
├── apps/web/              # React frontend (@hena-wadeena/web)
├── packages/
│   ├── types/             # @hena-wadeena/types — shared TypeScript types
│   └── nest-common/       # @hena-wadeena/nest-common — shared NestJS modules
├── services/
│   ├── identity/          # Auth, users, KYC, notifications, moderation  :8001
│   ├── market/            # Listings, commodities, investments, directory :8002
│   ├── guide-booking/     # Attractions, guides, tours, bookings         :8003
│   ├── map/               # POIs, carpool, moderation                    :8004
│   └── ai/                # RAG chatbot, Egyptian Arabic (Python)        :8005
├── gateway/               # Nginx config                                 :8000
├── scripts/seed/          # Database seed scripts (essential + showcase)
└── docs/                  # Architecture, specs, proposals
```

## Documentation

Each component has detailed documentation:

- **[Frontend](./apps/web/README.md)** - React app setup, architecture, features
- **[Gateway](./gateway/README.md)** - Nginx routing, rate limiting, CORS
- **Services:**
  - [Identity Service](./services/identity/README.md) - Auth, users, KYC, notifications
  - [Market Service](./services/market/README.md) - Listings, commodities, investments
  - [Guide-Booking Service](./services/guide-booking/README.md) - Attractions, guides, tours
  - [Map Service](./services/map/README.md) - POIs, carpool, geospatial features
  - [AI Service](./services/ai/README.md) - RAG chatbot, Egyptian Arabic
- **Packages:**
  - [@hena-wadeena/types](./packages/types/README.md) - Shared TypeScript types
  - [@hena-wadeena/nest-common](./packages/nest-common/README.md) - NestJS utilities
- **[Seed Scripts](./scripts/seed/README.md)** - Database seeding guide

## License

Apache 2.0 — see [LICENSE](./LICENSE).
