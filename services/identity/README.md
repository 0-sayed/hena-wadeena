# Identity Service

The Identity service is the authentication and user management backbone of the Hena Wadeena platform. It handles user registration, login, JWT-based authentication, KYC (Know Your Customer) verification, notifications, email delivery, user search, wallet management, and administrative controls.

## Responsibilities

- **Authentication**: Registration, login, logout, token refresh, password reset
- **User Management**: Profile CRUD, role management, status changes, soft deletes
- **KYC Verification**: Document submission, admin review workflow, verification status tracking
- **Notifications**: In-app notifications, real-time event consumption, read/unread tracking
- **Email**: Password reset emails, verification emails (via Resend)
- **Wallet**: Balance management (topup/deduct) in piasters (1 EGP = 100 piasters)
- **Search**: User search with Arabic text normalization and fuzzy matching
- **Unified Search**: Cross-service federated search orchestration
- **Admin**: User moderation, role assignments, audit logs
- **Statistics**: Platform-wide user metrics and analytics

## Features

### Authentication (`/auth`)
- User registration with email/phone
- Login with JWT access + refresh tokens
- Token refresh
- Password change (authenticated)
- Password reset via OTP (email-based)
- Session tracking (IP, user agent)

### User Management (`/auth/me`, `/users`)
- Get/update own profile
- Wallet balance queries
- Topup/deduct wallet balance
- Internal endpoint for service-to-service user lookups

### KYC (`/users/kyc`)
- Submit KYC documents (national ID, proof of address)
- View own KYC status
- Admin review endpoints (`/admin/kyc`)

### Notifications (`/notifications`)
- List user notifications (paginated)
- Unread count
- Mark individual/all as read
- Event-driven consumer (Redis Pub/Sub)
- Internal API for notification creation

### Admin (`/admin/users`, `/admin/kyc`)
- List all users with filters
- View user details
- Change user roles (ADMIN only)
- Change user status (active/suspended/banned)
- Soft delete users
- Review KYC submissions

### Search (`/search`)
- Unified cross-service search (markets, guides, attractions, listings)
- Arabic text normalization
- Fuzzy matching with pg_trgm

### Stats (`/stats`)
- Platform statistics (user counts, KYC metrics, etc.)

### Moderation (`/moderation`)
- Content moderation workflows (placeholder for future expansion)

## Tech Stack

### Core
- **Runtime**: Node.js 22
- **Framework**: NestJS 11
- **Language**: TypeScript 5.7 (strict mode)
- **Validation**: Zod + nestjs-zod

### Database
- **Database**: PostgreSQL 16
- **Schema**: `identity`
- **ORM**: Drizzle ORM 0.38
- **Migrations**: Drizzle Kit
- **ID Generation**: UUID v7 (time-sortable)

### Authentication
- **Strategy**: JWT (access + refresh tokens)
- **Library**: @nestjs/jwt + passport-jwt
- **Hashing**: Argon2 (@node-rs/argon2)

### Caching & Events
- **Cache**: Redis 7 (key prefix: `id:`)
- **Pub/Sub**: Redis Streams (notification events)

### Email
- **Provider**: Resend
- **Use Cases**: Password reset, verification emails

### Rate Limiting
- **Library**: @nestjs/throttler
- **Global**: 100 req/min
- **Auth endpoints**: 3-5 req/min (stricter)

### Shared Packages
- `@hena-wadeena/types`: Shared TypeScript types, DTOs, enums
- `@hena-wadeena/nest-common`: Guards, decorators, modules (Drizzle, Redis, S3, Logger)

## Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+ (with `identity` schema)
- Redis 7+
- Resend API key (for email)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hena_wadeena
DB_SCHEMA=identity

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@hena-wadeena.com

# Service
PORT=8001
NODE_ENV=development
LOG_LEVEL=info

# Internal API (for service-to-service calls)
INTERNAL_SECRET=your_internal_secret_here

# Seed
SEED_PASSWORD=password123
```

## Getting Started

### Install Dependencies

From the **monorepo root**:

```bash
pnpm install
```

Build shared packages first:

```bash
pnpm --filter @hena-wadeena/types build
pnpm --filter @hena-wadeena/nest-common build
```

### Database Setup

Ensure PostgreSQL is running with the `identity` schema initialized:

```bash
# Start Postgres via Docker Compose
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres

# Run init script (creates all schemas)
psql $DATABASE_URL -f scripts/init-schemas.sql
```

Run migrations:

```bash
pnpm --filter @hena-wadeena/identity db:migrate
```

### Seed Data

Two-layer seeding strategy:

```bash
# Essential layer: admin user + base data (default)
pnpm --filter @hena-wadeena/identity db:seed

# Showcase layer: demo users + realistic data
pnpm --filter @hena-wadeena/identity db:seed:showcase
```

**Essential seed users:**
- `admin@hena-wadeena.com` (role: `admin`)
- `tourist@example.com` (role: `tourist`)
- `investor@example.com` (role: `investor`)
- `merchant@example.com` (role: `merchant`)
- `guide@example.com` (role: `guide`)
- `student@example.com` (role: `student`)

All passwords default to `SEED_PASSWORD` from `.env`.

### Development Mode

From the **monorepo root**:

```bash
pnpm --filter @hena-wadeena/identity dev
```

Or from this directory:

```bash
pnpm dev
```

The service starts at `http://localhost:8001`.

API base path: `http://localhost:8001/api/v1`

Health check: `http://localhost:8001/health`

### Build

```bash
pnpm build
```

### Production Start

```bash
pnpm start
```

## Project Structure

```
services/identity/
├── drizzle/              # Drizzle migrations (auto-generated + custom SQL)
│   └── meta/             # Migration journal
├── src/
│   ├── admin/            # Admin user management controllers
│   ├── auth/             # Authentication (register, login, reset)
│   │   ├── dto/          # Request/response DTOs
│   │   └── strategies/   # Passport JWT strategy
│   ├── db/
│   │   ├── schema/       # Drizzle schema definitions
│   │   │   ├── users.ts
│   │   │   ├── user-kyc.ts
│   │   │   ├── notifications.ts
│   │   │   ├── auth-tokens.ts
│   │   │   ├── otp-codes.ts
│   │   │   ├── audit-events.ts
│   │   │   └── index.ts
│   │   ├── seed-data/    # Seed data (essential + showcase layers)
│   │   ├── migrate.ts    # Migration runner
│   │   └── seed.ts       # Seed script
│   ├── email/            # Email service (Resend)
│   ├── kyc/              # KYC submission & review
│   ├── moderation/       # Content moderation (future)
│   ├── notifications/    # In-app notifications + event consumer
│   ├── search/           # User search (Arabic + fuzzy)
│   ├── session/          # Session tracking (deprecated, kept for reference)
│   ├── stats/            # Platform statistics
│   ├── test-utils/       # Test helpers (mock DB, etc.)
│   ├── unified-search/   # Cross-service federated search
│   ├── users/            # User profile & wallet management
│   ├── app.module.ts     # Root module
│   └── main.ts           # Bootstrap
├── test/                 # E2E tests
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── vitest.e2e.config.ts
└── README.md
```

## Database Schema Overview

Schema name: `identity`

### Core Tables

#### `users`
- **PK**: `id` (UUID v7)
- **Columns**: `email` (unique), `phone` (unique, nullable), `full_name`, `display_name`, `avatar_url`, `password_hash`, `role` (enum), `status` (enum), `language`, `balance_piasters` (integer), `verified_at`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`
- **Indexes**: email, phone, role, status, created_at, soft-delete, full-text search (tsvector), trigram (pg_trgm)
- **Monetary Values**: All amounts stored in piasters (1 EGP = 100 piasters)

#### `user_kyc`
- **PK**: `id` (UUID v7)
- **FK**: `user_id` → `users.id` (unique)
- **Columns**: `national_id`, `address`, `proof_of_address_url`, `national_id_front_url`, `national_id_back_url`, `status` (pending/approved/rejected), `rejected_reason`, `reviewed_by` (FK to users), `reviewed_at`, `submitted_at`

#### `notifications`
- **PK**: `id` (UUID v7)
- **FK**: `user_id` → `users.id`
- **Columns**: `title`, `body`, `type` (enum), `metadata` (jsonb), `read_at`, `created_at`
- **Indexes**: user_id, created_at, unread (where read_at IS NULL)

#### `auth_tokens`
- **PK**: `id` (UUID v7)
- **FK**: `user_id` → `users.id`
- **Columns**: `token_hash`, `ip`, `user_agent`, `expires_at`, `revoked_at`, `created_at`
- **Use**: Refresh token tracking

#### `otp_codes`
- **PK**: `id` (UUID v7)
- **Columns**: `email`, `code_hash`, `type` (enum: password_reset, email_verification), `expires_at`, `used_at`, `created_at`
- **TTL**: 10 minutes

#### `audit_events`
- **PK**: `id` (UUID v7)
- **FK**: `user_id` → `users.id`, `actor_id` → `users.id`
- **Columns**: `entity_type`, `entity_id`, `event_type`, `metadata` (jsonb), `created_at`
- **Use**: Admin action audit trail (role changes, status changes, KYC reviews)

### Enums

- **`user_role`**: `admin`, `tourist`, `resident`, `investor`, `merchant`, `guide`, `student`, `driver`, `moderator`, `reviewer`
- **`user_status`**: `active`, `suspended`, `banned`
- **`kyc_status`**: `pending`, `approved`, `rejected`
- **`notification_type`**: `info`, `warning`, `success`, `error`
- **`otp_code_type`**: `password_reset`, `email_verification`

### Functions

- **`normalize_arabic(text)`**: Normalizes Arabic text for search (removes diacritics, normalizes Alef/Hamza variants)

## API Endpoints Overview

Base path: `/api/v1`

### Public Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login (returns JWT tokens) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/password-reset/request` | Request password reset OTP |
| POST | `/auth/password-reset/confirm` | Confirm reset with OTP |
| GET | `/search` | Unified cross-service search |

### Authenticated Routes

#### Auth & Profile
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/logout` | Logout (revoke refresh token) |
| POST | `/auth/change-password` | Change password |
| GET | `/auth/me` | Get own profile |
| PATCH | `/auth/me` | Update own profile |

#### Wallet
| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet` | Get wallet balance |
| POST | `/wallet/topup` | Add funds |
| POST | `/wallet/deduct` | Deduct funds |

#### KYC
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/kyc` | Submit KYC documents |
| GET | `/users/kyc` | Get own KYC status |

#### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List notifications (paginated) |
| GET | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |

### Admin Routes

Require `role: admin`

#### User Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users (with filters) |
| GET | `/admin/users/:id` | Get user by ID |
| PATCH | `/admin/users/:id/role` | Change user role |
| PATCH | `/admin/users/:id/status` | Change user status |
| DELETE | `/admin/users/:id` | Soft delete user |

#### KYC Review
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/kyc` | List KYC submissions (with filters) |
| GET | `/admin/kyc/:id` | Get KYC by ID |
| PATCH | `/admin/kyc/:id/review` | Approve/reject KYC |

### Internal Routes

Protected by `InternalGuard` (requires `INTERNAL_SECRET` header)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/internal/users/:id` | Get user basic info (for service-to-service calls) |
| POST | `/internal/notifications` | Create notification (for event consumers) |

### Statistics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Platform statistics (admin only) |

## Database Migrations

Migrations are managed by Drizzle Kit.

### Generate a Migration

After modifying schema files in `src/db/schema/`:

```bash
pnpm db:generate
```

This creates a timestamped `.sql` file in `drizzle/`.

### Custom SQL (Triggers, Functions, Policies)

For custom SQL (not Drizzle-generated):

```bash
pnpm exec drizzle-kit generate --custom --name=description-here
```

Edit the generated file and add your custom SQL.

### Run Migrations

```bash
pnpm db:migrate
```

### Important Rules

- NEVER manually edit generated migrations
- NEVER delete migration files or snapshots
- NEVER use `drizzle-kit drop`
- For local dev iteration: `pnpm exec drizzle-kit push` (schema-only, no migrations)
- For production: Always use `drizzle-kit generate` + committed migrations

## Seeding

Two-layer strategy:

### Essential Layer (Default)
```bash
pnpm db:seed
```

Creates:
- 1 admin user
- 5 role-based users (tourist, investor, merchant, guide, student)
- Minimal data for testing

### Showcase Layer
```bash
pnpm db:seed:showcase
```

Adds:
- 20+ demo users with realistic profiles
- KYC submissions in various states
- Sample notifications
- Audit events

Showcase data is additive (does not replace essential data).

## Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm test:e2e
```

### Watch Mode
```bash
pnpm test:watch
```

### Coverage
```bash
pnpm test -- --coverage
```

## Key Architectural Decisions

### 1. Money as Integers (Piasters)
All monetary values stored as integers (piasters, where 1 EGP = 100 piasters) to avoid floating-point precision issues. Never use `float` or `decimal` for currency.

### 2. UUID v7 for Primary Keys
UUIDs are time-sortable (compatible with `ORDER BY created_at`) and globally unique across services.

### 3. Soft Deletes
Users are soft-deleted (`deleted_at` timestamp) to preserve audit trails and relational integrity.

### 4. JWT Access + Refresh Tokens
- Access token: short-lived (15 minutes), stateless
- Refresh token: long-lived (7 days), tracked in `auth_tokens` table, revocable

### 5. Arabic Text Normalization
Custom PostgreSQL function `normalize_arabic()` removes diacritics and normalizes Alef/Hamza variants for consistent full-text search and fuzzy matching.

### 6. Redis Key Prefix Isolation
All Redis keys prefixed with `id:` to avoid collisions with other services sharing the same Redis instance.

### 7. Global Guards
- `JwtAuthGuard`: Enforces authentication on all routes (except `@Public()` decorated)
- `RolesGuard`: Enforces role-based access control (`@Roles(UserRole.ADMIN)`)
- `ThrottlerGuard`: Rate limits all endpoints (100 req/min default, stricter for auth)

### 8. Event-Driven Notifications
Notifications created via Redis Pub/Sub consumer (`notifications-events.consumer.ts`), allowing decoupled cross-service notification creation.

### 9. Internal API for Service-to-Service Calls
`/internal/*` endpoints protected by `InternalGuard` (shared secret header) for safe inter-service communication (e.g., other services fetching user profiles).

### 10. Argon2 for Password Hashing
Argon2id via `@node-rs/argon2` (native Rust bindings) for secure, performant password hashing (stronger than bcrypt, faster than pure JS).

### 11. Two-Layer Seeding
- **Essential**: Minimal data for CI/testing
- **Showcase**: Rich demo data for demos/development

Keeps seed scripts maintainable and avoids polluting test databases with unnecessary data.

## License

Private — Hena Wadeena Platform

---

**Service Maintainers**: Identity Team  
**Port**: 8001  
**Schema**: `identity`  
**Redis Prefix**: `id:`  
**Health Check**: `/health`
