# Guide-Booking Service

NestJS microservice for managing tourist attractions, tour guides, tour packages, bookings, and reviews in the Hena Wadeena platform.

## Overview

The Guide-Booking service is the core tourism management microservice that handles:
- **Attractions Catalog**: Historical sites, museums, natural landmarks, and points of interest across New Valley Governorate
- **Guide Profiles**: Licensed tour guide registration, profiles, availability, and ratings
- **Tour Packages**: Multi-day itineraries created by guides, linking attractions with pricing and schedules
- **Booking Management**: End-to-end booking lifecycle with state machine validation
- **Reviews & Ratings**: Tourist feedback system with helpful vote tracking
- **Search**: Internal federated search endpoint for unified platform search
- **Statistics**: Real-time dashboard metrics for admins and guides

## Features

### Attractions
- Public browsing and filtering by category, location, accessibility
- Full-text search with Arabic normalization
- PostGIS-powered geospatial queries (nearby attractions)
- Admin CRUD operations with image uploads

### Guides
- Guide profile creation with bio, languages, specialization
- Availability calendar management
- Aggregated ratings from completed bookings
- Guide discovery with filters (language, rating, availability)

### Tour Packages
- Multi-attraction itinerary creation by guides
- Duration, pricing (in piasters), max group size
- Public/private/draft visibility states
- Package discovery with filters and pagination

### Bookings
- State machine-validated booking lifecycle: `pending` → `confirmed` → `in_progress` → `completed`
- Cancellation support with business rules
- Role-based access: tourists book, guides manage, admins oversee
- Automatic review eligibility after completion

### Reviews
- Tourist reviews for completed bookings only
- 1-5 star rating with optional text feedback
- Helpful vote system (upvote/downvote)
- Auto-updates guide aggregate rating via PostgreSQL trigger

### Search
- Internal federated search for unified platform search (used by Gateway search orchestration)
- Arabic text normalization via custom PostgreSQL function
- Fuzzy matching with trigram similarity

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7 (strict mode)
- **Database**: PostgreSQL 16 + PostGIS (schema: `guide_booking`)
- **ORM**: Drizzle ORM 0.38
- **Cache**: Redis 7 (key prefix: `gb:`)
- **Storage**: AWS S3 (presigned URLs for image uploads)
- **Auth**: JWT (access tokens validated via shared secret)
- **Validation**: Zod 4 + drizzle-zod
- **Testing**: Vitest (unit + E2E)

## Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16 with PostGIS extension
- Redis 7
- AWS S3 bucket (for image uploads)

## Getting Started

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install

# Build shared packages first
pnpm --filter @hena-wadeena/types build
pnpm --filter @hena-wadeena/nest-common build
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and Qdrant
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
```

### 3. Configure Environment

Copy root `.env.example` to `.env` and set required variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hena_wadeena
DB_SCHEMA=guide_booking

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=<generate-with-openssl-rand-hex-32>
JWT_ACCESS_EXPIRES_IN=15m

# AWS S3
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=me-south-1
AWS_S3_BUCKET=hena-wadeena-uploads
AWS_S3_PRESIGNED_URL_EXPIRES=3600

# Service
GUIDE_BOOKING_PORT=8003
NODE_ENV=development
LOG_LEVEL=info
```

### 4. Run Migrations

```bash
cd services/guide-booking
pnpm db:migrate
```

### 5. Seed Database (Optional)

```bash
# Essential seed data (guides, attractions)
pnpm db:seed

# Showcase layer (sample bookings, reviews)
pnpm db:seed:showcase
```

### 6. Start Development Server

```bash
# From monorepo root
pnpm --filter @hena-wadeena/guide-booking dev

# Or from service directory
pnpm dev
```

Server starts at `http://localhost:8003/api/v1`

## Project Structure

```
services/guide-booking/
├── drizzle/                      # Generated migrations + custom SQL
│   ├── meta/                     # Drizzle journal
│   └── *.sql                     # Migration files
├── src/
│   ├── attractions/              # Attractions module
│   │   ├── attractions.controller.ts       # Public endpoints
│   │   ├── admin-attractions.controller.ts # Admin CRUD
│   │   ├── attractions.service.ts
│   │   ├── attractions.module.ts
│   │   └── dto/
│   ├── guides/                   # Guides module
│   │   ├── guides.controller.ts            # Public guide profiles
│   │   ├── my-guide.controller.ts          # Guide self-management
│   │   ├── admin-guides.controller.ts      # Admin guide approval
│   │   ├── guides.service.ts
│   │   ├── guides.module.ts
│   │   └── dto/
│   ├── tour-packages/            # Tour packages module
│   │   ├── tour-packages.controller.ts     # Public package discovery
│   │   ├── my-packages.controller.ts       # Guide package management
│   │   ├── admin-packages.controller.ts    # Admin package moderation
│   │   ├── tour-packages.service.ts
│   │   ├── tour-packages.module.ts
│   │   └── dto/
│   ├── bookings/                 # Bookings module
│   │   ├── bookings.controller.ts          # Create booking + view single
│   │   ├── my-bookings.controller.ts       # Tourist/guide booking lists
│   │   ├── admin-bookings.controller.ts    # Admin booking oversight
│   │   ├── bookings.service.ts
│   │   ├── bookings.module.ts
│   │   ├── booking-state-machine.ts        # State transition rules
│   │   └── dto/
│   ├── reviews/                  # Reviews module
│   │   ├── reviews.controller.ts           # Create/read reviews
│   │   ├── reviews.service.ts
│   │   ├── reviews.module.ts
│   │   └── dto/
│   ├── search/                   # Internal search module
│   │   ├── search.controller.ts            # /internal/search (blocked by Nginx)
│   │   ├── search.service.ts
│   │   └── search.module.ts
│   ├── stats/                    # Statistics module
│   │   ├── stats.controller.ts             # Dashboard metrics
│   │   ├── stats.service.ts
│   │   └── stats.module.ts
│   ├── db/
│   │   ├── schema/                         # Drizzle table definitions
│   │   │   ├── attractions.ts
│   │   │   ├── guides.ts
│   │   │   ├── tour-packages.ts
│   │   │   ├── bookings.ts
│   │   │   ├── reviews.ts
│   │   │   ├── guide-availability.ts
│   │   │   └── index.ts                    # Relations
│   │   ├── seed-data/                      # Seed data scripts
│   │   ├── enums.ts                        # PostgreSQL enums
│   │   ├── schema.ts                       # Schema export
│   │   ├── migrate.ts                      # Migration runner
│   │   └── seed.ts                         # Seed runner
│   ├── auth/
│   │   └── jwt.strategy.ts                 # Passport JWT strategy
│   ├── utils/
│   │   ├── query.ts                        # Query builders
│   │   └── test-helpers.ts                 # Test utilities
│   ├── app.module.ts                       # Root module
│   └── main.ts                             # Bootstrap
├── test/                         # E2E tests
│   ├── bookings.e2e-spec.ts
│   ├── guides.e2e-spec.ts
│   ├── reviews.e2e-spec.ts
│   ├── search.e2e-spec.ts
│   └── e2e-helpers.ts
├── drizzle.config.ts             # Drizzle Kit config
├── vitest.config.ts              # Vitest config
├── vitest.e2e.config.ts          # E2E test config
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema Overview

### Core Tables

- **attractions**: Tourist destinations (PostGIS `geometry(Point, 4326)` for location)
- **guides**: Tour guide profiles (linked to identity service users)
- **guide_availability**: Guide calendar (date ranges)
- **tour_packages**: Multi-day itineraries created by guides
- **tour_package_attractions**: Many-to-many link between packages and attractions
- **bookings**: Booking records with state machine validation
- **guide_reviews**: Reviews tied to completed bookings
- **guide_review_helpful_votes**: Upvote/downvote tracking for reviews

### Key Database Features

- **UUID v7 primary keys**: Time-sortable via `generateId()` from `@hena-wadeena/nest-common`
- **Monetary values**: Stored as integers (piasters, 1 EGP = 100 piasters)
- **Soft deletes**: `deleted_at` timestamp on select tables
- **Arabic normalization**: Custom PostgreSQL function `normalize_arabic_text()` for search
- **Auto-rating updates**: Trigger `update_guide_rating()` recalculates guide average on review insert/update/delete
- **Full-text search**: GIN indexes on tsvector columns with Arabic normalization

## API Endpoints Overview

All endpoints prefixed with `/api/v1` by the gateway.

### Attractions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/attractions` | Public | List/filter attractions |
| GET | `/attractions/:slug` | Public | Get attraction by slug |
| GET | `/attractions/:slug/nearby` | Public | Find nearby attractions (PostGIS) |
| POST | `/admin/attractions` | Admin | Create attraction |
| PATCH | `/admin/attractions/:id` | Admin | Update attraction |
| DELETE | `/admin/attractions/:id` | Admin | Soft-delete attraction |

### Guides

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/guides` | Public | List/filter guides |
| GET | `/guides/:id` | Public | Get guide profile |
| GET | `/guides/:id/packages` | Public | Get guide's tour packages |
| GET | `/guides/:id/reviews` | Public | Get guide's reviews |
| POST | `/my/guide` | Guide | Create/claim guide profile |
| PATCH | `/my/guide` | Guide | Update own profile |
| PATCH | `/admin/guides/:id/status` | Admin | Approve/suspend guide |

### Tour Packages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/packages` | Public | List public packages |
| GET | `/packages/:id` | Public | Get package details |
| POST | `/my/packages` | Guide | Create package |
| PATCH | `/my/packages/:id` | Guide | Update own package |
| DELETE | `/my/packages/:id` | Guide | Delete own package |
| POST | `/my/packages/:id/attractions` | Guide | Set package attractions |
| PATCH | `/admin/packages/:id/status` | Admin | Moderate package visibility |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings` | Tourist | Create booking |
| GET | `/bookings/:id` | Owner/Guide/Admin | Get booking details |
| GET | `/my/bookings` | Tourist/Guide | List own bookings |
| PATCH | `/my/bookings/:id/status` | Tourist/Guide | Confirm/cancel booking |
| GET | `/admin/bookings` | Admin | List all bookings |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reviews` | Tourist | Create review (completed booking only) |
| GET | `/reviews/:id` | Public | Get review details |
| POST | `/reviews/:id/vote` | Authenticated | Upvote/downvote review |

### Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats/dashboard` | Admin/Guide | Dashboard metrics (role-based) |

### Search (Internal)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/internal/search` | Internal | Federated search (blocked by Nginx for external) |

## Environment Variables

See root `.env.example` for full list. Key variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hena_wadeena
DB_SCHEMA=guide_booking

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=<required>
JWT_ACCESS_EXPIRES_IN=15m

# AWS S3
AWS_ACCESS_KEY_ID=<required>
AWS_SECRET_ACCESS_KEY=<required>
AWS_REGION=me-south-1
AWS_S3_BUCKET=hena-wadeena-uploads
AWS_S3_PRESIGNED_URL_EXPIRES=3600

# Service
GUIDE_BOOKING_PORT=8003
NODE_ENV=development
LOG_LEVEL=info
TRUST_PROXY=1

# Rate Limiting
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=100
```

## Database Migrations & Seeding

### Generating Migrations

```bash
# After modifying schema/*.ts files
pnpm db:generate

# For custom SQL (triggers, functions, seed data)
pnpm db:generate --custom --name=<description>
```

### Running Migrations

```bash
pnpm db:migrate
```

### Seeding Data

```bash
# Essential seed data only (guides, attractions)
pnpm db:seed

# Essential + showcase layer (bookings, reviews)
pnpm db:seed:showcase
```

**Seed layers:**
- **Essential**: Core data required for the app to function (guides, attractions)
- **Showcase**: Demo data for testing and showcasing features (bookings, reviews)

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch
```

Unit tests are colocated with source files (`*.spec.ts`).

### E2E Tests

```bash
# Run E2E tests
pnpm test:e2e
```

E2E tests are in `test/` directory and cover:
- Booking lifecycle (create, confirm, cancel, complete)
- Guide profile creation and approval
- Review creation and helpful votes
- Federated search

### Type Checking

```bash
pnpm typecheck
```

## Booking Workflow

The booking lifecycle follows a strict state machine with validated transitions:

```
pending → confirmed → in_progress → completed
   ↓          ↓            ↓
cancelled  cancelled   cancelled
```

### State Transitions

| From | To | Trigger | Notes |
|------|-----|---------|-------|
| pending | confirmed | Guide confirms | Tourist payment successful |
| pending | cancelled | Tourist/Guide cancels | Before confirmation |
| confirmed | in_progress | System/Guide starts tour | On scheduled start date |
| confirmed | cancelled | Tourist/Guide cancels | Refund logic applies |
| in_progress | completed | Guide marks complete | Tour finished |
| in_progress | cancelled | Force cancel | Rare, admin override |

### State Machine Validation

- Invalid transitions throw `BadRequestException` (e.g., `pending` → `in_progress`)
- Transitions are validated in `booking-state-machine.ts` via `validateTransition()`
- Event emission: `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_COMPLETED` events are emitted for cross-service communication (e.g., payment refunds, notifications)

### Review Eligibility

- Only tourists who have a `completed` booking can review
- One review per booking (enforced by unique constraint)
- Reviews auto-update guide's aggregate rating via PostgreSQL trigger

## Development

### Running Locally

```bash
# From monorepo root
pnpm --filter @hena-wadeena/guide-booking dev

# Service starts on http://localhost:8003
# API docs: http://localhost:8003/api/v1
```

### Building

```bash
pnpm build
```

Output in `dist/` directory.

### Running Production Build

```bash
pnpm start
```

## Health Check

```
GET /health
```

Returns service health status, database connectivity, and Redis connectivity.

## Related Services

- **Identity Service** (`:8001`): User authentication and roles
- **Market Service** (`:8002`): Marketplace for local products
- **Map Service** (`:8004`): Geospatial services and map data
- **AI Service** (`:8005`): Chatbot and recommendations
- **Gateway** (`:8000`): Nginx reverse proxy with rate limiting

## License

Private - Hena Wadeena Platform
