# T30 Admin: Market — Design Spec

> Admin endpoints for Market service content moderation, statistics, and listing management.

---

## Overview

T30 adds missing admin endpoints to the Market service per the API spec (03-api-surface.md, section 1.2.4). These endpoints enable administrators to:

- View platform-wide Market statistics
- List all listings regardless of status
- Approve or reject listings
- Toggle featured status
- View a unified moderation queue

**Dependencies:** T26 (Integration: Market)

**Out of scope:**
- AI-flagged review moderation (no flag field in schema, deferred)
- Cross-service statistics (Identity, Guide-Booking — separate services)
- Review moderation endpoints

---

## File Structure

```
services/market/src/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
├── admin.service.spec.ts
└── dto/
    ├── admin-stats.dto.ts
    ├── query-admin-listings.dto.ts
    ├── verify-listing.dto.ts
    └── feature-listing.dto.ts
```

The `AdminModule` imports existing modules and provides a unified `AdminService` that delegates to existing services where possible.

---

## Endpoints

All endpoints require `@Roles(UserRole.ADMIN)`.

### GET /admin/stats

Returns aggregated statistics for the Market service.

**Response: `AdminStatsDto`**

```typescript
interface AdminStatsDto {
  listings: {
    total: number;
    draft: number;
    active: number;
    suspended: number;
    verified: number;
    featured: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
  investments: {
    opportunities: number;
    applications: {
      total: number;
      pending: number;
      reviewed: number;
      accepted: number;
      rejected: number;
    };
  };
  businesses: {
    total: number;
    verified: number;
    pending: number;
  };
  commodities: {
    total: number;
    activePrices: number;
  };
}
```

**Implementation:**
- Single service method with parallel `COUNT(*)` queries
- No caching for MVP (admin traffic is low)

---

### GET /admin/listings

Returns all listings including draft, suspended, and deleted (soft-deleted excluded by default).

**Query Parameters: `QueryAdminListingsDto`**

| Param | Type | Description |
|-------|------|-------------|
| `status` | `draft \| active \| suspended` | Filter by status |
| `is_verified` | `boolean` | Filter by verification |
| `is_featured` | `boolean` | Filter by featured |
| `owner_id` | `uuid` | Filter by owner |
| `offset` | `number` | Pagination offset (default 0) |
| `limit` | `number` | Pagination limit (default 20, max 100) |
| `sort` | `string` | Sort field and direction (e.g., `created_at|desc`) |

**Response:** `PaginatedResponse<Listing>`

**Implementation:**
- New `findAllAdmin()` method in `ListingsService` that bypasses the `status='active'` filter
- Reuses existing pagination and sort helpers

---

### PATCH /admin/listings/:id/verify

Approves or rejects a listing.

**Request Body: `VerifyListingDto`**

```typescript
interface VerifyListingDto {
  action: 'approve' | 'reject';
  reason?: string; // Optional rejection reason
}
```

**Behavior:**

| Action | Field Changes | Event |
|--------|---------------|-------|
| `approve` | `status='active'`, `isVerified=true`, `approvedBy=adminId`, `approvedAt=now()` | `EVENTS.LISTING_VERIFIED` |
| `reject` | `status='suspended'` | None |

**Response:** Updated listing object

**Edge cases:**
- Approving an already-active listing: idempotent, updates `approvedAt`, emits event
- Rejecting an already-suspended listing: idempotent, no-op
- Listing not found: 404 NotFoundException

**Implementation:**
- New `verify()` method in `ListingsService`
- Emits `listing.verified` event via RedisStreams on approval (consumed by AI service for KB update)

---

### PATCH /admin/listings/:id/feature

Toggles or sets featured status on a listing.

**Request Body: `FeatureListingDto`**

```typescript
interface FeatureListingDto {
  featured: boolean;
  featuredUntil?: string; // ISO 8601 date, optional expiry
}
```

**Behavior:**
- Sets `isFeatured` to the provided value
- Sets `featuredUntil` if provided (nullable to remove expiry)

**Response:** Updated listing object

**Edge cases:**
- Featuring an already-featured listing: idempotent, updates `featuredUntil` if provided
- Listing not found: 404 NotFoundException

**Implementation:**
- New `setFeatured()` method in `ListingsService`

---

### GET /admin/moderation/queue

Returns a unified queue of content pending moderation across Market domains.

**Response: `ModerationQueueDto`**

```typescript
interface ModerationQueueDto {
  listings: {
    count: number;
    items: Array<{
      id: string;
      titleAr: string;
      titleEn: string | null;
      category: string;
      ownerId: string;
      createdAt: string;
    }>;
  };
  businesses: {
    count: number;
    items: Array<{
      id: string;
      nameAr: string;
      nameEn: string | null;
      ownerId: string;
      createdAt: string;
    }>;
  };
  investments: {
    count: number;
    items: Array<{
      id: string;
      titleAr: string;
      titleEn: string | null;
      sector: string;
      ownerId: string;
      createdAt: string;
    }>;
  };
  totalPending: number;
}
```

**What's included:**
- Listings with `status='draft'` (pending approval)
- Businesses with `isVerified=false`
- Investment opportunities with `status='review'`

**Implementation:**
- Parallel queries to each domain
- Returns up to 10 most recent items per category (full list via individual endpoints)
- `totalPending` is the sum of all counts

---

## Service Layer

### AdminService

```typescript
@Injectable()
export class AdminService {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly reviewsService: ReviewsService,
    private readonly investmentsService: InvestmentOpportunitiesService,
    private readonly applicationsService: InvestmentApplicationsService,
    private readonly businessService: BusinessDirectoryService,
    private readonly commodityService: CommodityPricesService,
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
  ) {}

  async getStats(): Promise<AdminStatsDto> { ... }
  async getModerationQueue(): Promise<ModerationQueueDto> { ... }
}
```

### ListingsService (new methods)

```typescript
// Added to existing ListingsService

async findAllAdmin(query: QueryAdminListingsDto): Promise<PaginatedResponse<Listing>> {
  // Bypasses status='active' filter
  // Supports status, is_verified, is_featured, owner_id filters
}

async verify(id: string, dto: VerifyListingDto, adminId: string): Promise<Listing> {
  // Sets status, isVerified, approvedBy, approvedAt
  // Emits LISTING_VERIFIED on approve
}

async setFeatured(id: string, dto: FeatureListingDto): Promise<Listing> {
  // Sets isFeatured, featuredUntil
}
```

---

## Module Wiring

```typescript
// admin.module.ts
@Module({
  imports: [
    ListingsModule,
    ReviewsModule,
    InvestmentOpportunitiesModule,
    InvestmentApplicationsModule,
    BusinessDirectoryModule,
    CommodityPricesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

```typescript
// app.module.ts — add AdminModule to imports
imports: [
  // ... existing modules
  AdminModule,
],
```

---

## Testing

### Unit Tests (`admin.service.spec.ts`)

| Test | Assertion |
|------|-----------|
| `getStats()` returns correct counts | Mock DB, verify aggregation |
| `getModerationQueue()` aggregates pending items | Mock services, verify structure |

### Unit Tests (ListingsService additions)

| Test | Assertion |
|------|-----------|
| `findAllAdmin()` bypasses status filter | Returns draft/suspended listings |
| `findAllAdmin()` respects query filters | Status, verified, featured filters work |
| `verify()` with approve | Sets fields correctly, emits event |
| `verify()` with reject | Sets status to suspended, no event |
| `verify()` on non-existent listing | Throws NotFoundException |
| `setFeatured()` toggles featured | Sets isFeatured and featuredUntil |

### Controller Tests

| Test | Assertion |
|------|-----------|
| All endpoints require ADMIN role | 403 for non-admin |
| Invalid listing ID returns 404 | NotFoundException |

---

## Event Contract

**Event:** `listing.verified`

```typescript
{
  listingId: string;
  titleAr: string;
  titleEn: string;
  category: string;
  district: string;
  ownerId: string;
  verifiedBy: string;
  verifiedAt: string; // ISO 8601
}
```

**Emitter:** Market Service (AdminService/ListingsService)
**Consumer:** AI Service (KB update)

---

## Implementation Order

1. Create DTOs (`dto/` folder)
2. Add methods to `ListingsService` (`findAllAdmin`, `verify`, `setFeatured`)
3. Add tests for new ListingsService methods
4. Create `AdminService` with `getStats()` and `getModerationQueue()`
5. Add tests for AdminService
6. Create `AdminController` with all 5 endpoints
7. Create `AdminModule` and wire into `AppModule`
8. Run full test suite
