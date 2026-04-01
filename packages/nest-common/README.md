# @hena-wadeena/nest-common

**Shared NestJS modules, guards, decorators, and utilities for Hena Wadeena backend services.**

This package provides reusable NestJS infrastructure code used across all microservices.

## ⚠️ Backend Only

**This package is NOT imported by the React frontend.** It contains NestJS-specific code with server-side dependencies (AWS SDK, Drizzle, Redis, Pino).

For frontend-safe types, use [`@hena-wadeena/types`](../types/README.md) instead.

## Installation

This package is internal to the Hena Wadeena monorepo and installed via pnpm workspaces:

```bash
pnpm install
```

Import in NestJS services:

```typescript
import { 
  JwtAuthGuard, 
  CurrentUser, 
  RedisCacheModule,
  generateId 
} from '@hena-wadeena/nest-common';
```

## What's Included

### Modules

#### Health Module

Provides `/health` endpoint with database + Redis checks:

```typescript
import { HealthModule } from '@hena-wadeena/nest-common';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

Exposes:
- `GET /health` — Returns 200 if all checks pass
- Auto-registered with `@nestjs/terminus`

#### Redis Module

Redis client with connection pooling, key prefixes, and Redis Streams support:

```typescript
import { RedisCacheModule, RedisStreamsService } from '@hena-wadeena/nest-common';

@Module({
  imports: [
    RedisCacheModule.register({
      prefix: 'mkt:', // Isolate keys per service
    }),
  ],
})
export class MarketModule {}

// In your service
export class MarketService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly streams: RedisStreamsService,
  ) {}

  async cacheResult(key: string, data: unknown) {
    await this.redis.set(key, JSON.stringify(data), 'EX', 3600);
  }

  async publishEvent(event: UserCreatedEvent) {
    await this.streams.publish('user.created', event);
  }
}
```

**Features:**
- Auto-prefixes all keys (prevents cross-service collisions)
- Redis Streams for event-driven architecture
- Connection pooling via `ioredis`

#### S3 Module

AWS S3 client for file uploads (avatars, KYC documents, listing images):

```typescript
import { S3Module, S3Service } from '@hena-wadeena/nest-common';

@Module({
  imports: [S3Module],
})
export class IdentityModule {}

// In your service
export class KycService {
  constructor(private readonly s3: S3Service) {}

  async uploadDocument(file: Express.Multer.File, userId: string) {
    const key = await this.s3.uploadFile(file, `kyc/${userId}`);
    return key;
  }

  async getDocumentUrl(key: string) {
    return this.s3.getPresignedUrl(key, 3600); // 1 hour expiry
  }
}
```

**Configuration (via environment):**
```bash
S3_REGION=eu-central-1
S3_BUCKET=hena-wadeena-uploads
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

#### Drizzle Module

PostgreSQL connection via Drizzle ORM with schema isolation:

```typescript
import { DrizzleModule, DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';

@Module({
  imports: [
    DrizzleModule.forRoot({
      schema: 'market', // PostgreSQL schema for this service
    }),
  ],
})
export class MarketModule {}

// In your service
export class ListingsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DbClient) {}

  async findAll() {
    return this.db.select().from(listingsTable);
  }
}
```

**Features:**
- Schema isolation (`search_path` per service)
- Connection pooling via `postgres` driver
- Type-safe queries with Drizzle ORM

#### Logger Module

Structured JSON logging via Pino with correlation IDs:

```typescript
import { LoggerModule } from '@hena-wadeena/nest-common';

@Module({
  imports: [LoggerModule],
})
export class AppModule {}
```

**Features:**
- Auto-attached correlation ID (`x-correlation-id` header)
- JSON output for production, pretty-print for development
- Request/response logging with latency

### Guards

#### JwtAuthGuard

Validates JWT access tokens (applied globally by default):

```typescript
import { JwtAuthGuard } from '@hena-wadeena/nest-common';

// Applied globally in main.ts
app.useGlobalGuards(new JwtAuthGuard(reflector));

// Bypass on specific routes
@Public()
@Get('public-listings')
async getPublicListings() {
  // ...
}
```

#### RolesGuard

Role-based access control:

```typescript
import { Roles, RolesGuard } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';

@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
async deleteUser(@Param('id') id: string) {
  // Only admins can access
}
```

#### KycVerifiedGuard

Requires user to have KYC approved:

```typescript
import { KycVerifiedGuard } from '@hena-wadeena/nest-common';

@UseGuards(KycVerifiedGuard)
@Post('apply')
async applyForOpportunity(@CurrentUser() user: JwtPayload) {
  // Only KYC-approved users can apply
}
```

#### OptionalJwtAuthGuard

Extracts user from JWT if present, but doesn't block anonymous access:

```typescript
import { OptionalJwtAuthGuard } from '@hena-wadeena/nest-common';

@UseGuards(OptionalJwtAuthGuard)
@Get('listings')
async getListings(@CurrentUser() user?: JwtPayload) {
  // user is undefined if no token provided
}
```

#### InternalGuard

Blocks external access to internal-only routes (used with Nginx blocking `/internal/*`):

```typescript
import { InternalGuard } from '@hena-wadeena/nest-common';

@UseGuards(InternalGuard)
@Get('internal/stats')
async getInternalStats() {
  // Only accessible from other services
}
```

### Decorators

#### @Public()

Bypass JWT authentication on specific routes:

```typescript
import { Public } from '@hena-wadeena/nest-common';

@Public()
@Post('register')
async register(@Body() dto: RegisterDto) {
  // No auth required
}
```

#### @Roles()

Require specific user roles:

```typescript
import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';

@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Delete(':id')
async deleteContent() {
  // Only admins/moderators
}
```

#### @CurrentUser()

Extract JWT payload from request:

```typescript
import { CurrentUser } from '@hena-wadeena/nest-common';
import { JwtPayload } from '@hena-wadeena/types';

@Get('me')
async getProfile(@CurrentUser() user: JwtPayload) {
  return this.usersService.findById(user.sub);
}
```

#### @OptionalJwt()

Mark route as using optional JWT (for use with `OptionalJwtAuthGuard`):

```typescript
import { OptionalJwt } from '@hena-wadeena/nest-common';

@OptionalJwt()
@Get('listings')
async getListings(@CurrentUser() user?: JwtPayload) {
  // user may be undefined
}
```

### Utilities

#### UUID Generation

UUID v7 (time-sortable) for primary keys:

```typescript
import { generateId } from '@hena-wadeena/nest-common';

const userId = generateId(); // "01H8X..." (UUID v7)
```

#### Pagination

Transform Drizzle results into paginated responses:

```typescript
import { paginateResponse } from '@hena-wadeena/nest-common';
import { PaginatedResponse } from '@hena-wadeena/types';

const users = await this.db.select().from(usersTable).limit(limit).offset(offset);
const total = await this.db.select({ count: count() }).from(usersTable);

return paginateResponse(users, total[0].count, offset, limit);
```

#### Arabic Text Normalization

Remove diacritics and normalize Arabic text for search:

```typescript
import { normalizeArabic } from '@hena-wadeena/nest-common';

const normalized = normalizeArabic('مَطْعَمُ الوَاحَةِ'); // "مطعم الواحة"
```

#### Drizzle Helpers

```typescript
import { jsonbColumn } from '@hena-wadeena/nest-common';

// Define JSONB columns with type safety
const metadata = jsonbColumn<Record<string, unknown>>('metadata');
```

### Bootstrap Helper

Common app configuration for all services:

```typescript
import { configureApp } from '@hena-wadeena/nest-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    port: 8001,
    serviceName: 'Identity Service',
  });
}
```

**Applies:**
- Helmet security headers
- Trust proxy (for Nginx reverse proxy)
- Global prefix `/api/v1` (excludes `/health`)
- Shutdown hooks

### Configuration

Environment variable helpers with Zod validation:

```typescript
import { loadEnvConfig, JWT_CONFIG } from '@hena-wadeena/nest-common';

const config = loadEnvConfig(); // Validates all required env vars

// JWT config for Passport
@Module({
  imports: [
    JwtModule.register(JWT_CONFIG),
  ],
})
```

**Required environment variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hena_wadeena

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# S3
S3_REGION=eu-central-1
S3_BUCKET=hena-wadeena-uploads
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Directory Structure

```
packages/nest-common/src/
├── config/              # Env validation, JWT config, Redis prefixes
├── decorators/          # @Public(), @Roles(), @CurrentUser(), etc.
├── guards/              # JwtAuthGuard, RolesGuard, KycVerifiedGuard, etc.
├── modules/
│   ├── drizzle/         # DrizzleModule (PostgreSQL)
│   ├── health/          # HealthModule (Terminus)
│   ├── logger/          # LoggerModule (Pino)
│   ├── redis/           # RedisCacheModule + RedisStreamsService
│   └── s3/              # S3Module + S3Service
├── utils/               # UUID, pagination, Arabic normalization
├── bootstrap.ts         # configureApp() helper
└── index.ts             # Main export barrel
```

## Build Process

Built with **TypeScript compiler** (no bundler):

```bash
# Build once
pnpm build

# Watch mode
pnpm dev

# Type-check
pnpm typecheck

# Run tests
pnpm test
```

**Output:**
- `dist/` — Compiled JavaScript + type declarations

## Peer Dependencies

This package requires these dependencies in consuming services:

```json
{
  "@nestjs/common": "^11.0.0",
  "@nestjs/core": "^11.0.0",
  "reflect-metadata": "^0.2.0",
  "rxjs": "^7.8.0"
}
```

All Hena Wadeena services already include these in their `package.json`.

## Example Service Setup

Typical service `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { configureApp, LoggerModule } from '@hena-wadeena/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // Use Pino instead
  });

  await configureApp(app, {
    port: 8001,
    serviceName: 'Identity Service',
  });
}
bootstrap();
```

Typical service `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { 
  HealthModule, 
  LoggerModule, 
  RedisCacheModule,
  DrizzleModule,
  S3Module,
} from '@hena-wadeena/nest-common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    LoggerModule,
    HealthModule,
    RedisCacheModule.register({ prefix: 'id:' }),
    DrizzleModule.forRoot({ schema: 'identity' }),
    S3Module,
    UsersModule,
  ],
})
export class AppModule {}
```

## Testing

Tests live next to source files in `__tests__/` directories:

```
utils/
  ├── arabic.ts
  └── __tests__/
      └── arabic.spec.ts
```

Run with Vitest:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

## Related Packages

- [`@hena-wadeena/types`](../types/README.md) — Shared types (frontend + backend)
- [`services/*`](../../services/README.md) — NestJS microservices (consume this package)

## Contributing

When adding new utilities:

1. Place them in the appropriate directory (`modules/`, `guards/`, etc.)
2. Export from the directory's `index.ts`
3. Ensure the main `src/index.ts` re-exports the directory
4. Add tests if the utility has logic
5. Rebuild: `pnpm build`

**Convention:**
- Modules: PascalCase + `Module` suffix
- Guards: PascalCase + `Guard` suffix
- Decorators: PascalCase (function)
- Services: PascalCase + `Service` suffix
- Functions: camelCase

## Architecture Notes

### Redis Key Prefixes

Each service uses a unique Redis key prefix to prevent collisions:

- `id:` — Identity service
- `mkt:` — Market service
- `gb:` — Guide-Booking service
- `map:` — Map service
- `ai:` — AI service
- `gw:` — Gateway

Configure via `RedisCacheModule.register({ prefix: 'mkt:' })`.

### Schema Isolation

Each service uses its own PostgreSQL schema via `search_path`:

- `identity` — Identity service
- `market` — Market service
- `guide_booking` — Guide-Booking service
- `map` — Map service
- `ai` — AI service

Configure via `DrizzleModule.forRoot({ schema: 'market' })`.

**Never write cross-schema JOINs.** Use Redis Streams for inter-service communication.

## License

Private — Hena Wadeena Project © 2024
