# Map Service

NestJS microservice for geospatial features, Points of Interest (POIs), and carpool/ride-sharing functionality for the Hena Wadeena platform.

## Overview

The Map service manages all location-based features for New Valley Governorate, including:

- **Points of Interest (POIs)**: User-submitted locations with moderation workflow
- **Carpool/Ride-Sharing**: Driver-passenger matching with geospatial queries
- **Federated Search**: Internal search endpoint for the unified search gateway
- **Statistics**: Internal metrics aggregation for admin dashboards
- **Moderation**: Pending content review queue

## Features

### Points of Interest (POIs)
- User submission of locations with Arabic/English names
- 8 categories: historical, natural, religious, recreational, accommodation, restaurant, service, government
- Moderation workflow (pending → approved/rejected)
- Ratings system (average + count)
- Full-text search with Arabic normalization
- Geospatial radius search
- Image attachments support

### Carpool/Ride-Sharing
- Drivers create rides with origin/destination, departure time, seats, and optional pricing
- Passengers can join/leave rides
- Status lifecycle: open → full/departed → completed/cancelled
- Geospatial filters (origin/destination proximity)
- Date range filtering

### Search
- Internal-only endpoint (`/internal/search`) called by the unified search gateway
- Arabic full-text search with normalization
- Returns POIs and carpool rides matching query

### Moderation
- Internal-only endpoint (`/internal/moderation`) for pending POI review
- Returns submitted items awaiting approval

### Statistics
- Internal-only endpoint (`/internal/stats`)
- Aggregates POI and carpool counts for dashboards

## Tech Stack

- **Runtime**: Node.js 22
- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 with PostGIS extension
- **ORM**: Drizzle ORM with migrations
- **Cache/Events**: Redis (key prefix: `map:`)
- **Auth**: JWT (access tokens only, verified via shared secret)
- **Validation**: Zod schemas via nestjs-zod
- **Testing**: Vitest (unit + E2E)

## Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16 with PostGIS extension
- Redis 7+

## Getting Started

### Install Dependencies

```bash
# From monorepo root
pnpm install

# Build shared packages first
pnpm --filter @hena-wadeena/types build
pnpm --filter @hena-wadeena/nest-common build
```

### Environment Variables

The service reads from the monorepo root `.env` file. Required variables:

```bash
# Service
NODE_ENV=development
SERVICE_NAME=map
PORT=8004

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hena_wadeena
DB_SCHEMA=map

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password  # optional

# JWT (shared with other services)
JWT_ACCESS_SECRET=your-256-bit-secret-minimum-32-chars
JWT_ACCESS_EXPIRES_IN=15m

# AWS S3 (for POI images)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=me-south-1
AWS_S3_BUCKET=your-bucket
AWS_S3_PRESIGNED_URL_EXPIRES=3600

# Rate Limiting
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info
TRUST_PROXY=1
```

### Database Setup

```bash
# Initialize PostgreSQL schemas (from monorepo root)
psql $DATABASE_URL -f scripts/init-schemas.sql

# Run migrations
pnpm --filter @hena-wadeena/map db:migrate

# Seed essential data
pnpm --filter @hena-wadeena/map db:seed

# Seed showcase data (optional, for demo purposes)
pnpm --filter @hena-wadeena/map db:seed:showcase
```

### Run Development Server

```bash
# From monorepo root
pnpm --filter @hena-wadeena/map dev

# Service will start on http://localhost:8004
```

### Run All Services

```bash
# From monorepo root (starts all NestJS services)
pnpm dev
```

## Project Structure

```
services/map/
├── src/
│   ├── auth/                    # JWT strategy
│   ├── carpool/                 # Ride-sharing module
│   │   ├── dto/                 # Request/response DTOs
│   │   ├── carpool.controller.ts
│   │   ├── my-carpool.controller.ts  # User-specific rides
│   │   └── carpool.service.ts
│   ├── config/                  # Environment validation
│   │   └── env.config.ts
│   ├── db/                      # Database layer
│   │   ├── schema/              # Drizzle schema definitions
│   │   │   ├── points-of-interest.ts
│   │   │   ├── carpool-rides.ts
│   │   │   ├── carpool-passengers.ts
│   │   │   └── types.ts         # Custom column types (tsvector)
│   │   ├── seed-data/           # Seed scripts
│   │   ├── enums.ts             # PostgreSQL enums
│   │   ├── schema.ts            # Schema namespace
│   │   ├── migrate.ts           # Migration runner
│   │   └── seed.ts              # Seed runner
│   ├── moderation/              # Pending items review
│   │   └── moderation.controller.ts
│   ├── pois/                    # Points of Interest module
│   │   ├── dto/                 # Request/response DTOs
│   │   ├── pois.controller.ts   # Public endpoints
│   │   ├── my-pois.controller.ts  # User-specific POIs
│   │   ├── admin-pois.controller.ts  # Moderation actions
│   │   └── pois.service.ts
│   ├── search/                  # Federated search
│   │   ├── dto/
│   │   ├── search.controller.ts
│   │   └── search.service.ts
│   ├── stats/                   # Statistics aggregation
│   │   ├── stats.controller.ts
│   │   └── stats.service.ts
│   ├── utils/                   # Shared utilities
│   │   ├── postgis.ts           # PostGIS helper functions
│   │   ├── query.ts             # Query builders
│   │   └── schemas.ts           # Zod schemas
│   ├── app.module.ts
│   └── main.ts
├── test/                        # E2E tests
│   ├── carpool.e2e-spec.ts
│   ├── pois.e2e-spec.ts
│   ├── search.e2e-spec.ts
│   └── e2e-helpers.ts
├── drizzle/                     # Migration files
│   ├── meta/                    # Migration journal
│   └── *.sql                    # Generated migrations
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Database Schema Overview

The service uses PostgreSQL schema `map` with PostGIS extension for geospatial features.

### Tables

#### `points_of_interest`
- **id**: UUID v7 (primary key)
- **name_ar**: Arabic name (required)
- **name_en**: English name (optional)
- **description**: Text description
- **category**: Enum (historical, natural, religious, recreational, accommodation, restaurant, service, government)
- **location**: `geometry(Point, 4326)` — PostGIS point in WGS84 (SRID 4326)
- **address**, **phone**, **website**: Contact information
- **images**: Array of S3 URLs
- **rating_avg**: Real (0-5), **rating_count**: Integer
- **status**: Enum (pending, approved, rejected)
- **submitted_by**, **approved_by**: User UUIDs
- **rejection_reason**: Admin feedback on rejected POIs
- **search_vector**: `tsvector` — generated column for full-text search with Arabic normalization
- **created_at**, **updated_at**, **deleted_at**: Timestamps

**Indexes**:
- GIST on `location` (geospatial queries)
- GIN on `search_vector` (full-text search)
- B-tree on `category`, `status`, `submitted_by`, `created_at`

#### `carpool_rides`
- **id**: UUID v7 (primary key)
- **driver_id**: User UUID
- **origin**, **destination**: `geometry(Point, 4326)` — PostGIS points
- **origin_name**, **destination_name**: Human-readable location names
- **departure_time**: Timestamp with timezone
- **seats_total**, **seats_taken**: Integer (constraints: seats_taken ≤ seats_total)
- **price_per_seat**: Integer (piasters, 1 EGP = 100 piasters)
- **notes**: Text
- **status**: Enum (open, full, departed, completed, cancelled)
- **created_at**: Timestamp

**Indexes**:
- GIST on `origin`, `destination` (geospatial queries)
- B-tree on `driver_id`, `status`, `departure_time`

#### `carpool_passengers`
- **id**: UUID v7 (primary key)
- **ride_id**: Foreign key to `carpool_rides`
- **passenger_id**: User UUID
- **seats_reserved**: Integer
- **status**: Enum (requested, confirmed, declined, cancelled)
- **created_at**: Timestamp

**Indexes**:
- B-tree on `ride_id`, `passenger_id`, `status`
- Unique constraint on `(ride_id, passenger_id)` where status is active

### Custom Functions

- **`normalize_arabic(text)`**: Normalizes Arabic text for full-text search (removes diacritics, normalizes hamza/alef forms)

## API Endpoints Overview

All endpoints are prefixed with `/api/v1` (configured in gateway).

### Public Endpoints

#### POIs
- `GET /map/pois` — List approved POIs (supports filters: category, near, within, search)
- `GET /map/pois/:id` — Get single POI by ID

#### Carpool
- `GET /carpool` — List available rides (supports filters: near_origin, near_destination, departure_after, departure_before)
- `GET /carpool/:id` — Get single ride by ID (shows join status if authenticated)

### Authenticated Endpoints

#### My POIs
- `GET /my/pois` — User's submitted POIs
- `POST /my/pois` — Submit new POI
- `PATCH /my/pois/:id` — Update own POI
- `DELETE /my/pois/:id` — Delete own POI (soft delete)

#### My Carpool
- `GET /my/carpool/rides` — User's created rides
- `POST /my/carpool/rides` — Create new ride
- `PATCH /my/carpool/rides/:id` — Update own ride
- `DELETE /my/carpool/rides/:id` — Cancel ride
- `GET /my/carpool/bookings` — User's joined rides
- `POST /carpool/:rideId/join` — Join a ride
- `DELETE /carpool/:rideId/leave` — Leave a ride

#### Admin Endpoints
- `PATCH /admin/pois/:id/approve` — Approve pending POI (role: ADMIN)
- `PATCH /admin/pois/:id/reject` — Reject pending POI (role: ADMIN)

### Internal Endpoints (blocked from external access by Nginx)

- `GET /internal/search` — Federated search (returns POIs + carpool rides)
- `GET /internal/moderation` — Pending items queue
- `GET /internal/stats` — Service statistics (POI count, ride count)

### Health Check

- `GET /health` — Service health status (database + Redis)

## Database Migrations & Seeding

### Generate Migration

```bash
# After modifying schema files in src/db/schema/
pnpm --filter @hena-wadeena/map db:generate

# For custom SQL (triggers, functions, seed data):
pnpm --filter @hena-wadeena/map db:generate -- --custom --name=description
```

### Apply Migrations

```bash
pnpm --filter @hena-wadeena/map db:migrate
```

### Seed Database

```bash
# Essential data only (enums are in migrations, no seed needed)
pnpm --filter @hena-wadeena/map db:seed

# Showcase data (demo POIs and rides)
pnpm --filter @hena-wadeena/map db:seed:showcase
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm --filter @hena-wadeena/map test

# Watch mode
pnpm --filter @hena-wadeena/map test:watch
```

### E2E Tests

```bash
# Run E2E tests (requires running database and Redis)
pnpm --filter @hena-wadeena/map test:e2e
```

### Validation

```bash
# Lint, typecheck, test, and build
pnpm --filter @hena-wadeena/map validate
```

## Geospatial Features

### Coordinate Format

All coordinates use **WGS84 (SRID 4326)** with longitude-first ordering:

```typescript
// PostGIS point: SRID 4326, (longitude, latitude)
{ x: 30.123, y: 25.456 }  // x = longitude, y = latitude
```

When creating points:
```typescript
import { makePoint } from './utils/postgis';

// makePoint(longitude, latitude)
const location = makePoint(30.123, 25.456);
```

### Distance Queries

The service uses PostGIS geography type for accurate distance calculations on Earth's surface.

```typescript
import { withinRadius, distanceTo } from './utils/postgis';

// Find POIs within 5km of a point
const point = makePoint(30.123, 25.456);
await db
  .select()
  .from(pointsOfInterest)
  .where(withinRadius(pointsOfInterest.location, point, 5000)); // meters

// Calculate distance to a point (returns meters)
await db
  .select({
    id: pointsOfInterest.id,
    distance: distanceTo(pointsOfInterest.location, point),
  })
  .from(pointsOfInterest);
```

### Spatial Indexes

All geometry columns use **GIST indexes** for efficient spatial queries:
- `points_of_interest.location`
- `carpool_rides.origin`
- `carpool_rides.destination`

### Full-Text Search with Arabic

POIs have a generated `search_vector` column that normalizes Arabic text (removes diacritics, normalizes hamza/alef variants) for accurate search:

```sql
-- Custom function applied during indexing
CREATE FUNCTION map.normalize_arabic(text) RETURNS text;

-- Generated column in points_of_interest table
search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce(name_ar, ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce(description, ''))), 'B') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce(address, ''))), 'B')
) STORED;
```

Query example:
```typescript
const searchTerm = 'مسجد'; // Arabic for "mosque"
await db
  .select()
  .from(pointsOfInterest)
  .where(sql`${pointsOfInterest.searchVector} @@ plainto_tsquery('simple', map.normalize_arabic(${searchTerm}))`);
```

## Development Notes

- **Money values**: Always use integers (piasters, 1 EGP = 100 piasters). NEVER use float/decimal.
- **Schema isolation**: Use `mapSchema` from `src/db/schema.ts` for all tables/enums.
- **PostGIS functions**: Always use `public.` prefix (e.g., `public.ST_MakePoint`) since PostGIS is in public schema.
- **Soft deletes**: POIs support soft deletion via `deleted_at` column. Use `WHERE deleted_at IS NULL` in queries.
- **Internal routes**: `/internal/*` routes are protected by `InternalGuard` and blocked from external access by Nginx.

## Related Services

- **Identity Service** (port 8001): User authentication and profile management
- **Unified Search Gateway**: Fans out search queries to Map service and others
- **AI Service** (port 8005): May consume POI data for recommendations

## License

Private — Hena Wadeena Project
