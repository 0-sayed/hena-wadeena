# @hena-wadeena/types

**Pure TypeScript types, interfaces, DTOs, and enums for Hena Wadeena.**

This package provides a shared type system that can be safely imported by **both frontend and backend** code.

## Philosophy

- **Zero runtime dependencies** — only TypeScript type definitions
- **Isomorphic** — safe to import in React components, NestJS services, or any TypeScript environment
- **Single source of truth** — all shared types live here to avoid duplication
- **Pure data structures** — no framework-specific code (no React, no NestJS decorators)

## Installation

This package is internal to the Hena Wadeena monorepo and installed via pnpm workspaces:

```bash
pnpm install
```

Import in any TypeScript file:

```typescript
import { UserRole, PaginatedResponse, piastresToEgp } from '@hena-wadeena/types';
```

## What's Included

### Enums

Comprehensive enums for all domain entities. English values stored in database:

```typescript
import { UserRole, KycStatus, ListingType, BookingStatus } from '@hena-wadeena/types';

const role: UserRole = UserRole.MERCHANT;
const status: KycStatus = KycStatus.APPROVED;
```

**Available enums:**
- **Identity:** `UserRole`, `UserStatus`, `KycStatus`, `KycDocType`, `NotificationType`
- **Market:** `ListingType`, `ListingStatus`, `ListingCategory`, `TransactionType`, `BusinessStatus`
- **Guide-Booking:** `BookingStatus`, `GuideLanguage`, `GuideSpecialty`, `ReviewTargetType`
- **Map:** `PoiCategory`, `PoiStatus`, `CarpoolStatus`, `PassengerStatus`
- **Investment:** `OpportunityStatus`, `InvestmentSector`, `ApplicationStatus`
- **Commodity:** `CommodityUnit`, `CommodityCategory`, `PriceType`
- **Shared:** `NvDistrict`, `SavedItemType`, `VerificationStatus`

### DTOs

Data transfer objects for API requests/responses:

```typescript
import { PaginatedResponse } from '@hena-wadeena/types';

const response: PaginatedResponse<User> = {
  data: users,
  total: 100,
  page: 1,
  limit: 20,
  hasMore: true,
};
```

### Events

Type-safe event contracts for Redis Streams inter-service communication:

```typescript
import { EVENTS, EventName } from '@hena-wadeena/types';

// Use event constants to ensure type safety
const eventName: EventName = EVENTS.USER_VERIFIED;

// Event payload is defined by the emitting service
const event = {
  type: eventName,
  payload: {
    userId: '01H8X...',
    verifiedAt: new Date().toISOString(),
  },
};
```

### Identity

User-related types and notification interfaces:

```typescript
import { PublicUser, Notification } from '@hena-wadeena/types';

const user: PublicUser = {
  id: '01H8X...',
  email: 'user@example.com',
  phone: null,
  fullName: 'Ahmed Hassan',
  displayName: null,
  avatarUrl: null,
  role: UserRole.TOURIST,
  status: UserStatus.ACTIVE,
  language: 'ar',
  verifiedAt: new Date(),
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Utilities

Helper functions with zero runtime dependencies:

```typescript
import { piastresToEgp, egpToPiasters, slugify } from '@hena-wadeena/types';

// Monetary conversion (all prices stored as integer piasters)
const display = piastresToEgp(15000); // "150.00 ج.م."
const storage = egpToPiasters(150.50); // 15050

// Slugification
const slug = slugify('مطعم الواحة الخضراء'); // "mtrm-alwah-alkhdr"
```

### Search

Unified search types for federated search API:

```typescript
import { UnifiedSearchResponse } from '@hena-wadeena/types';

const response: UnifiedSearchResponse = {
  data: [],
  hasMore: false,
  query: 'واحة سيوة',
  sources: ['market', 'guide-booking'],
};
```

## Directory Structure

```
packages/types/src/
├── dto/                 # Data transfer objects (pagination, etc.)
├── enums/               # All domain enums (exported as single file)
├── events/              # Event contracts for Redis Streams
├── identity/            # User, JWT, notification types
├── utils/               # Pure utility functions (monetary, slug)
├── search.ts            # Unified search types
└── index.ts             # Main export barrel
```

## Build Process

Built with **tsup** for fast dual-format output (CJS + ESM):

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
- `dist/index.js` — CommonJS
- `dist/index.mjs` — ES Modules
- `dist/index.d.ts` — TypeScript declarations

## When to Add New Types

Add types to this package when they are:

1. **Shared across services** — used by 2+ microservices
2. **Shared frontend/backend** — used by React app + NestJS API
3. **Pure data structures** — no framework-specific decorators or runtime dependencies
4. **Stable contracts** — DTOs, enums, event shapes unlikely to change frequently

**Do NOT add:**
- Drizzle schemas (use service-specific `/database` folder)
- NestJS decorators/guards (use `@hena-wadeena/nest-common`)
- React components or hooks
- Runtime utilities with npm dependencies

## Examples

### Frontend (React)

```tsx
import { UserRole, piastresToEgp } from '@hena-wadeena/types';

function ListingCard({ listing }) {
  return (
    <div>
      <h3>{listing.title}</h3>
      <p>{piastresToEgp(listing.priceInPiasters)}</p>
    </div>
  );
}
```

### Backend (NestJS)

```typescript
import { UserRole, PaginatedResponse } from '@hena-wadeena/types';

export class UsersService {
  async findAll(offset: number, limit: number): Promise<PaginatedResponse<User>> {
    const users = await this.db.select().from(usersTable).limit(limit).offset(offset);
    const total = await this.db.select({ count: count() }).from(usersTable);
    
    return {
      data: users,
      total: total[0].count,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total[0].count,
    };
  }
}
```

### Event Publishing

```typescript
import { EVENTS } from '@hena-wadeena/types';

await this.redisStreams.publish(EVENTS.USER_VERIFIED, {
  userId: user.id,
  verifiedAt: new Date().toISOString(),
});
```

## Testing

Tests live next to source files in `__tests__/` directories:

```
utils/
  ├── monetary.ts
  └── __tests__/
      └── monetary.spec.ts
```

Run with Vitest:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

## Related Packages

- [`@hena-wadeena/nest-common`](../nest-common/README.md) — NestJS-specific utilities (backend only)
- [`apps/web`](../../apps/web/README.md) — React frontend (consumes this package)
- [`services/*`](../../services/README.md) — NestJS microservices (consume this package)

## Contributing

When adding new types:

1. Place them in the appropriate directory (`dto/`, `enums/`, etc.)
2. Export from the directory's `index.ts`
3. Ensure the main `src/index.ts` re-exports the directory
4. Add tests if the type includes utility functions
5. Rebuild: `pnpm build`

**Convention:**
- Enums: PascalCase with SCREAMING_SNAKE_CASE values
- Interfaces: PascalCase
- Types: PascalCase
- Functions: camelCase

## Monetary Values

**Critical:** All monetary values in the system are stored as **integer piasters** (1 EGP = 100 piasters). This package provides conversion utilities:

```typescript
import { piastresToEgp, egpToPiasters } from '@hena-wadeena/types';

// Display to user
const userFacingPrice = piastresToEgp(25000); // "250.00 ج.م."

// Store in database
const dbValue = egpToPiasters(250.50); // 25050
```

Never use `float` or `decimal` for money — always integer piasters.

## License

Private — Hena Wadeena Project © 2024
