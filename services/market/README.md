# Market Service

The **Market Service** is the commercial hub of Hena Wadeena, providing a comprehensive marketplace platform for New Valley Governorate. It manages listings, commodity price tracking, business directories, investment opportunities, and reviews.

## Overview

This service handles all market-related functionality including:
- **Listings**: Property rentals, product sales, and service offerings
- **Commodity Price Tracking**: Historical price data, daily price updates, and price indices
- **Business Directory**: Verified business registrations with commodity listings
- **Investment Opportunities**: Investment listings and application management
- **Reviews & Ratings**: User feedback system with helpful vote tracking
- **Search**: Arabic full-text search with fuzzy matching across all market entities

## Features

### Listings Management
- Create and manage property/product/service listings
- Image upload via S3 presigned URLs
- Featured listings support
- Geospatial queries (find nearby listings)
- Slug-based and ID-based lookup
- Owner-based access control

### Commodity Price Tracking
- Daily commodity price snapshots
- Historical price data with configurable time ranges
- Price index dashboard with trends
- Batch price import for admin
- Price summary statistics
- Support for multiple units (kg, bag, piece, liter)

### Business Directory
- Business registration with verification workflow
- Commodity associations for businesses
- Admin/reviewer approval system
- Verified business badge
- Business search and filtering

### Investment Opportunities
- Investment listing creation by merchants/investors
- Sector-based categorization
- Featured investment opportunities
- Application tracking
- Investment status management (open, funded, closed)
- Document upload support

### Investment Applications
- Apply to investment opportunities
- Document submission via S3
- Status tracking (pending, approved, rejected, withdrawn)
- Admin review interface

### Reviews & Ratings
- 5-star rating system
- Review helpful votes
- Review ownership verification
- Listing-based review queries
- User review history

### Unified Search
- Arabic full-text search across listings, businesses, and investments
- Fuzzy matching with Arabic normalization
- Internal-only endpoint (called via gateway fan-out)

### Admin Statistics
- Total counts for listings, businesses, investments, applications
- Price snapshot metrics

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 with PostGIS (schema: `market`)
- **ORM**: Drizzle ORM with migrations
- **Cache**: Redis with `mkt:` prefix
- **Storage**: AWS S3 for images and documents
- **Validation**: Zod + nestjs-zod
- **Authentication**: JWT with passport-jwt
- **Rate Limiting**: @nestjs/throttler (100 req/min default)
- **Testing**: Vitest with E2E tests

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16 with PostGIS extension
- Redis 7+
- AWS S3 bucket (or S3-compatible storage)

## Getting Started

### Install Dependencies

From the repository root:

```bash
pnpm install

# Build shared packages first
pnpm --filter @hena-wadeena/types build
pnpm --filter @hena-wadeena/nest-common build
```

### Environment Variables

Copy `.env.example` to `.env` at the repository root and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hena_wadeena
DB_SCHEMA=market

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT (generate with: openssl rand -hex 32)
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=me-south-1
AWS_S3_BUCKET=hena-wadeena-uploads

# Internal service communication
INTERNAL_SECRET=your_internal_secret
```

### Database Setup

```bash
# Start PostgreSQL + Redis via Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# Run migrations
pnpm --filter @hena-wadeena/market db:migrate

# Seed essential data (categories, sample commodities)
pnpm --filter @hena-wadeena/market db:seed

# Optionally seed showcase data (demo listings, businesses, investments)
pnpm --filter @hena-wadeena/market db:seed:showcase
```

### Run Development Server

```bash
# Run only Market service
pnpm --filter @hena-wadeena/market dev

# Or run all services
pnpm dev
```

The service will be available at `http://localhost:8002`.

## Project Structure

```
services/market/
├── drizzle/                      # Drizzle migrations
│   ├── 20260312204933_*.sql      # Initial schema
│   ├── 20260327062336_*.sql      # Arabic normalization
│   └── meta/                     # Migration journal
├── src/
│   ├── admin/                    # Admin statistics endpoints
│   ├── auth/                     # JWT strategy & auth module
│   ├── business-directory/       # Business registration & verification
│   │   ├── business-directory.controller.ts
│   │   ├── business-directory.service.ts
│   │   └── dto/
│   ├── commodity-prices/         # Price tracking & index
│   │   ├── commodity-prices.controller.ts
│   │   ├── commodity-prices.service.ts
│   │   └── dto/
│   ├── db/
│   │   ├── schema/               # Drizzle schema definitions
│   │   │   ├── listings.ts
│   │   │   ├── commodities.ts
│   │   │   ├── commodity-prices.ts
│   │   │   ├── business-directories.ts
│   │   │   ├── investment-opportunities.ts
│   │   │   ├── investment-applications.ts
│   │   │   ├── reviews.ts
│   │   │   └── index.ts
│   │   ├── seed-data/            # Seed data generators
│   │   ├── enums.ts              # Database enums
│   │   ├── migrate.ts            # Migration runner
│   │   └── seed.ts               # Seed script
│   ├── investment-applications/  # Investment application management
│   ├── investment-opportunities/ # Investment listings
│   ├── listings/                 # Property/product/service listings
│   │   ├── listings.controller.ts
│   │   ├── listings.service.ts
│   │   └── dto/
│   ├── reviews/                  # Review & rating system
│   ├── search/                   # Internal search endpoint
│   ├── shared/                   # Shared utilities
│   ├── stats/                    # Statistics & analytics
│   ├── app.module.ts             # Root application module
│   └── main.ts                   # Bootstrap & server config
├── test/                         # E2E tests
│   ├── listings.e2e-spec.ts
│   ├── commodity-prices.e2e-spec.ts
│   ├── business-directory.e2e-spec.ts
│   └── search.e2e-spec.ts
├── drizzle.config.ts             # Drizzle Kit configuration
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Database Schema Overview

The Market service uses the `market` PostgreSQL schema with the following key tables:

### Core Tables

- **listings**: Properties, products, and services for rent/sale
  - UUID v7 IDs, slug, title (Arabic), description, price (integer piasters), images, category, status
  - PostGIS `geometry(Point, 4326)` for location
  - Full-text search column (`search_vector`)

- **commodities**: Commodity catalog (e.g., rice, dates, tomatoes)
  - Name (Arabic), category, unit, icon, active status

- **commodity_prices**: Daily price snapshots
  - Date, commodity ID, price (integer piasters), source, market location
  - Unique constraint: `(commodity_id, price_date)`

- **price_snapshots**: Pre-computed price history cache

- **business_directories**: Verified business listings
  - Name, description, category, contact info, location
  - Verification status (pending, approved, rejected)
  - Full-text search column

- **business_commodities**: Junction table for businesses ↔ commodities

- **investment_opportunities**: Investment listings
  - Title, description, sector, minimum investment, target amount, returns
  - Status (open, funded, closed)
  - Location support

- **investment_applications**: User applications for investments
  - Status (pending, approved, rejected, withdrawn)
  - Documents array (S3 keys)

- **reviews**: User reviews for listings
  - Rating (1-5), comment, author ID, listing ID
  - Moderation status

- **review_helpful_votes**: Helpful vote tracking (user ID + review ID)

### Key Constraints

- All PKs are UUID v7 (time-sortable via `generateId()`)
- All timestamps are `timestamptz`
- All monetary values are **integer piasters** (1 EGP = 100 piasters)
- Arabic text columns use `citext` for case-insensitive search
- Full-text search uses `tsvector` with custom Arabic normalization function

## API Endpoints Overview

### Listings

- `GET /api/v1/listings` - List all listings (public, paginated)
- `GET /api/v1/listings/featured` - Featured listings
- `GET /api/v1/listings/mine` - User's own listings (auth required)
- `GET /api/v1/listings/nearby?lat=&lng=&radius=` - Geospatial search
- `GET /api/v1/listings/slug/:slug` - Get by slug
- `GET /api/v1/listings/:id` - Get by ID
- `GET /api/v1/listings/:id/reviews` - Get listing reviews
- `POST /api/v1/listings` - Create listing (merchant/investor/resident)
- `PATCH /api/v1/listings/:id` - Update listing (owner or admin)
- `DELETE /api/v1/listings/:id` - Delete listing (owner or admin)
- `POST /api/v1/listings/:id/images` - Generate S3 upload URL

### Commodities & Prices

- `GET /api/v1/commodities` - List all commodities (public)
- `GET /api/v1/commodities/:id` - Get commodity by ID
- `GET /api/v1/commodities/:id/price-history` - Historical prices
- `POST /api/v1/commodities` - Create commodity (admin only)
- `PATCH /api/v1/commodities/:id` - Update commodity (admin only)
- `PATCH /api/v1/commodities/:id/deactivate` - Deactivate commodity (admin only)
- `POST /api/v1/commodity-prices` - Add price entry (admin only)
- `POST /api/v1/commodity-prices/batch` - Batch import prices (admin only)
- `PATCH /api/v1/commodity-prices/:id` - Update price (admin only)
- `DELETE /api/v1/commodity-prices/:id` - Delete price (admin only)

### Price Index

- `GET /api/v1/price-index` - Current price index (public)
- `GET /api/v1/price-index/summary` - Price summary statistics

### Business Directory

- `GET /api/v1/businesses` - List all verified businesses (public)
- `GET /api/v1/businesses/mine` - User's businesses (merchant/investor)
- `GET /api/v1/businesses/pending` - Pending verification (admin/reviewer)
- `GET /api/v1/businesses/:id` - Get business by ID
- `POST /api/v1/businesses` - Register business (merchant/investor)
- `PATCH /api/v1/businesses/:id` - Update business (owner or admin)
- `PATCH /api/v1/businesses/:id/verify` - Verify business (admin/reviewer)
- `DELETE /api/v1/businesses/:id` - Delete business (owner or admin)

### Investment Opportunities

- `GET /api/v1/investments` - List all opportunities (public)
- `GET /api/v1/investments/featured` - Featured opportunities
- `GET /api/v1/investments/sectors` - Sector statistics
- `GET /api/v1/investments/mine` - User's opportunities (investor/merchant)
- `GET /api/v1/investments/:id` - Get opportunity by ID
- `POST /api/v1/investments` - Create opportunity (investor/merchant/admin)
- `PUT /api/v1/investments/:id` - Update opportunity (owner or admin)
- `PATCH /api/v1/investments/:id/close` - Close opportunity (owner or admin)

### Investment Applications

- `GET /api/v1/investment-applications` - List applications (admin)
- `GET /api/v1/investment-applications/mine` - User's applications
- `GET /api/v1/investment-applications/:id` - Get application by ID
- `POST /api/v1/investment-applications` - Submit application
- `PATCH /api/v1/investment-applications/:id` - Update application status (admin)
- `POST /api/v1/investment-applications/:id/documents` - Generate document upload URL

### Reviews

- `GET /api/v1/reviews/:id` - Get review by ID (public)
- `GET /api/v1/reviews/mine` - User's reviews (auth required)
- `POST /api/v1/reviews` - Create review (tourist/student/investor/resident)
- `PUT /api/v1/reviews/:id` - Update review (owner)
- `DELETE /api/v1/reviews/:id` - Delete review (owner or admin)
- `POST /api/v1/reviews/:id/helpful` - Mark review as helpful

### Search (Internal Only)

- `GET /api/v1/internal/search?q=&categories=&limit=` - Unified search (called by gateway)

### Admin Statistics

- `GET /api/v1/admin/stats` - Get admin statistics (admin only)

### Health

- `GET /health` - Health check endpoint

## Database Migrations & Seeding

### Generate Migration

After modifying schema files in `src/db/schema/`:

```bash
# Auto-generate migration from schema changes
pnpm --filter @hena-wadeena/market db:generate

# For custom SQL (triggers, functions, seed data)
pnpm --filter @hena-wadeena/market db:generate --custom --name=add-custom-function
```

### Run Migrations

```bash
pnpm --filter @hena-wadeena/market db:migrate
```

### Seed Database

The seed system has two layers:

1. **Essential Layer** (default): Core data required for the service to function
   - Commodity categories and units
   - Sample commodity catalog

2. **Showcase Layer**: Demo data for testing and demonstrations
   - Sample listings with images
   - Sample businesses with commodities
   - Sample investment opportunities
   - Sample reviews

```bash
# Seed essential data only
pnpm --filter @hena-wadeena/market db:seed

# Seed essential + showcase data
pnpm --filter @hena-wadeena/market db:seed:showcase
```

## Testing

### Run Tests

```bash
# Unit tests
pnpm --filter @hena-wadeena/market test

# Watch mode
pnpm --filter @hena-wadeena/market test:watch

# E2E tests
pnpm --filter @hena-wadeena/market test:e2e
```

### E2E Test Coverage

- `listings.e2e-spec.ts`: Listing CRUD, search, image upload
- `commodity-prices.e2e-spec.ts`: Price entry, history, index
- `business-directory.e2e-spec.ts`: Business registration, verification
- `search.e2e-spec.ts`: Arabic full-text search with fuzzy matching
- `integration.e2e-spec.ts`: Cross-module integration tests

## Key Features

### Price Tracking

The commodity price system maintains historical daily prices with:
- Daily price snapshots (unique per commodity per day)
- Pre-computed price history cache for fast queries
- Percentage change calculations
- Support for multiple markets and sources

### Arabic Full-Text Search

Implements custom Arabic normalization for fuzzy matching:
- Removes diacritics (تشكيل)
- Normalizes Alef variants (أ، إ، آ → ا)
- Normalizes Taa Marbuta (ة → ه)
- Case-insensitive search with `citext`
- PostgreSQL `tsvector` for full-text indexing

### Investment Application Workflow

1. User submits application with optional documents
2. Admin reviews application
3. Status transitions: pending → approved/rejected
4. User can withdraw application before approval
5. Document uploads via S3 presigned URLs

### Business Verification

1. Merchant registers business
2. Admin/reviewer verifies business details
3. Verified businesses get badge
4. Can associate commodities they offer
5. Searchable in business directory

### Geospatial Queries

Uses PostGIS for location-based features:
- Find listings within radius
- Distance calculation
- Point geometry with SRID 4326 (WGS 84)

## Development

### Type Checking

```bash
pnpm --filter @hena-wadeena/market typecheck
```

### Build

```bash
pnpm --filter @hena-wadeena/market build
```

### Run Production Build

```bash
# Build first
pnpm --filter @hena-wadeena/market build

# Then start
PORT=8002 DB_SCHEMA=market NODE_ENV=production pnpm --filter @hena-wadeena/market start
```

## Related Services

- **Identity Service** (port 8001): User authentication and authorization
- **Gateway** (port 8000): Nginx reverse proxy with rate limiting
- **AI Service** (port 8005): Unified search fan-out and AI chat

## Shared Packages

- `@hena-wadeena/types`: Shared TypeScript types, DTOs, and event contracts
- `@hena-wadeena/nest-common`: Shared NestJS utilities (guards, decorators, modules)

## License

Proprietary - New Valley Governorate Digital Platform
