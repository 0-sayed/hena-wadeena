# Hena Wadeena — AI Agent Instructions

## Project Overview

Unified digital platform for New Valley Governorate, Egypt. Monorepo with 5 microservices + React frontend.

## Quick Start

```bash
# Infrastructure (Postgres, Redis, Qdrant)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis qdrant

# Install dependencies
pnpm install

# Build shared packages first
pnpm --filter @hena-wadeena/types build
pnpm --filter @hena-wadeena/nest-common build

# Run a specific service
pnpm --filter @hena-wadeena/identity dev

# Run all NestJS services
pnpm dev

# AI service (Python)
cd services/ai && uv sync && uv run uvicorn src.main:app --reload --port 8005
```

## Architecture

- **Monorepo:** pnpm workspaces (NestJS) + uv (Python AI service)
- **Services:** identity (:8001), market (:8002), guide-booking (:8003), map (:8004), ai (:8005)
- **Gateway:** Nginx (:8000) — routes, rate limits, blocks /internal/*
- **Database:** Single PostgreSQL 16 + PostGIS, 5 schemas (identity, market, guide_booking, map, ai)
- **Cache/Events:** Redis 7 (key-prefix isolated: id:, mkt:, gb:, map:, ai:, gw:)
- **Vector DB:** Qdrant (AI service only)

## Shared Packages

| Package | Import | Purpose |
|---------|--------|---------|
| `@hena-wadeena/types` | Frontend + Backend | Pure TS: interfaces, enums, DTOs, event contracts. Zero runtime deps. |
| `@hena-wadeena/nest-common` | Backend only | Guards, decorators, modules (Health, Redis, S3, Drizzle, Logger). |

## Conventions

### Code Style
- TypeScript strict mode (`strict: true` in root tsconfig)
- ESLint flat config with type-checked rules
- Prettier for formatting
- Conventional commits (feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert)

### Database
- All PKs: UUID v7 (time-sortable) via `generateId()` from `@hena-wadeena/nest-common`
- All timestamps: `timestamptz`
- Geo columns: PostGIS `geometry(Point, 4326)`
- Soft deletes: `deleted_at` where applicable
- **Monetary values: integer (piasters, 1 EGP = 100 piasters). NEVER float/decimal.**
- Schema isolation: each service uses its own PostgreSQL schema via `search_path`

### Drizzle Migrations
- Generated migrations (`drizzle-kit generate`) are **machine-owned** — do NOT manually edit them. Fix the schema `.ts` files and regenerate instead.
- Custom SQL (triggers, functions, RLS policies, seed data) goes in a **separate** migration file: `drizzle-kit generate --custom --name=<description>`. This keeps generated DDL and hand-written SQL cleanly separated.
- Migration files live at `services/<name>/drizzle/` with `meta/_journal.json` tracking apply order.
- When reviewing migrations, only review `--custom` files — generated `.sql` files are derived from the schema and should not be nitpicked.

### API
- Global prefix: `/api/v1`
- Health check: `/health` (excluded from prefix for Docker healthcheck)
- Internal routes: `/internal/*` (blocked by Nginx from external access)
- Pagination: offset/limit with `PaginatedResponse<T>` from `@hena-wadeena/types`

### Authentication
- JWT access + refresh tokens
- `@Public()` decorator to bypass auth on specific routes
- `@Roles(UserRole.ADMIN)` for role-based access
- `@CurrentUser()` to extract user from request
- `JwtAuthGuard` applied globally

### Error Handling
- Use NestJS built-in exceptions (BadRequestException, NotFoundException, etc.)
- Business logic errors: throw custom exceptions extending HttpException
- All errors return JSON: `{ statusCode, message, error }`
- Log errors with structured logging (Pino) — correlation ID auto-attached

### Testing
- Vitest for all TypeScript tests
- Unit tests: `*.spec.ts` next to source files
- E2E tests: `test/*.e2e-spec.ts` in service root
- `pnpm validate` = lint + typecheck + test + knip + audit + build

### Docker
- Build stage: `node:22`
- Runtime stage: `node:22-slim`
- AI service: `python:3.12-slim`
- Dev: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

## Banned Behaviors

- NEVER use `float` or `decimal` for money — always integer piasters
- NEVER modify applied Drizzle migrations
- NEVER append custom SQL (triggers, functions, etc.) to generated migration files — use `drizzle-kit generate --custom` instead
- NEVER use `drizzle-kit push` — always `drizzle-kit generate` + `migrate.ts` (dev and prod alike)
- NEVER import `@hena-wadeena/nest-common` from frontend code
- NEVER add cross-schema JOINs in database queries
- NEVER commit `.env` files or real secrets
- NEVER use `any` without justification (warn-level ESLint rule)
- NEVER skip `strict: true` in TypeScript configs

## File Paths

| What | Where |
|------|-------|
| Shared types | `packages/types/src/` |
| NestJS utilities | `packages/nest-common/src/` |
| Identity service | `services/identity/src/` |
| Market service | `services/market/src/` |
| Guide-Booking service | `services/guide-booking/src/` |
| Map service | `services/map/src/` |
| AI service | `services/ai/src/` |
| Nginx config | `gateway/nginx.conf` |
| DB init script | `scripts/init-schemas.sql` |
| Env template | `.env.example` |
