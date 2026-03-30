# T30 Admin: Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin endpoints to Market service for statistics, listing moderation, and content queue management.

**Architecture:** Single AdminModule with AdminController and AdminService. New methods added to ListingsService for verify/feature operations. All endpoints require ADMIN role.

**Tech Stack:** NestJS, Drizzle ORM, Zod DTOs, Vitest, Redis Streams for events

---

## File Structure

```
services/market/src/admin/
├── admin.module.ts          # Module wiring
├── admin.controller.ts      # 5 admin endpoints
├── admin.service.ts         # Stats and moderation queue logic
├── admin.service.spec.ts    # Unit tests
└── dto/
    ├── admin-stats.dto.ts           # Stats response shape
    ├── query-admin-listings.dto.ts  # Admin listings query params
    ├── verify-listing.dto.ts        # Approve/reject request
    └── feature-listing.dto.ts       # Featured toggle request
```

**Modified files:**
- `services/market/src/listings/listings.service.ts` — add `findAllAdmin`, `verify`, `setFeatured`
- `services/market/src/listings/listings.service.spec.ts` — tests for new methods
- `services/market/src/app.module.ts` — import AdminModule

---

## Task 1: Create Admin DTOs

**Files:**
- Create: `services/market/src/admin/dto/verify-listing.dto.ts`
- Create: `services/market/src/admin/dto/feature-listing.dto.ts`
- Create: `services/market/src/admin/dto/query-admin-listings.dto.ts`
- Create: `services/market/src/admin/dto/admin-stats.dto.ts`

- [ ] **Step 1: Create dto directory**

Run: `mkdir -p services/market/src/admin/dto`

- [ ] **Step 2: Create verify-listing.dto.ts**

```typescript
// services/market/src/admin/dto/verify-listing.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const verifyListingSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

export class VerifyListingDto extends createZodDto(verifyListingSchema) {}
```

- [ ] **Step 3: Create feature-listing.dto.ts**

```typescript
// services/market/src/admin/dto/feature-listing.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const featureListingSchema = z.object({
  featured: z.boolean(),
  featuredUntil: z.coerce.date().optional(),
});

export class FeatureListingDto extends createZodDto(featureListingSchema) {}
```

- [ ] **Step 4: Create query-admin-listings.dto.ts**

```typescript
// services/market/src/admin/dto/query-admin-listings.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryAdminListingsSchema = z.object({
  status: z.enum(['draft', 'active', 'suspended']).optional(),
  is_verified: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  is_featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  owner_id: z.string().uuid().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(
      /^(created_at|price|rating_avg|views_count)\|(asc|desc)$/,
      'sort must be field|direction (e.g. created_at|desc)',
    )
    .optional(),
});

export class QueryAdminListingsDto extends createZodDto(queryAdminListingsSchema) {}
```

- [ ] **Step 5: Create admin-stats.dto.ts**

```typescript
// services/market/src/admin/dto/admin-stats.dto.ts

export interface ListingStats {
  total: number;
  draft: number;
  active: number;
  suspended: number;
  verified: number;
  featured: number;
}

export interface ReviewStats {
  total: number;
  averageRating: number;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewed: number;
  accepted: number;
  rejected: number;
}

export interface InvestmentStats {
  opportunities: number;
  applications: ApplicationStats;
}

export interface BusinessStats {
  total: number;
  verified: number;
  pending: number;
}

export interface CommodityStats {
  total: number;
  activePrices: number;
}

export interface AdminStatsDto {
  listings: ListingStats;
  reviews: ReviewStats;
  investments: InvestmentStats;
  businesses: BusinessStats;
  commodities: CommodityStats;
}

export interface ModerationItem {
  id: string;
  titleAr: string;
  titleEn: string | null;
  ownerId: string;
  createdAt: string;
}

export interface BusinessModerationItem {
  id: string;
  nameAr: string;
  nameEn: string | null;
  ownerId: string;
  createdAt: string;
}

export interface InvestmentModerationItem extends ModerationItem {
  sector: string;
}

export interface ModerationQueueDto {
  listings: {
    count: number;
    items: ModerationItem[];
  };
  businesses: {
    count: number;
    items: BusinessModerationItem[];
  };
  investments: {
    count: number;
    items: InvestmentModerationItem[];
  };
  totalPending: number;
}
```

- [ ] **Step 6: Create dto index file**

```typescript
// services/market/src/admin/dto/index.ts
export * from './admin-stats.dto';
export * from './feature-listing.dto';
export * from './query-admin-listings.dto';
export * from './verify-listing.dto';
```

- [ ] **Step 7: Commit DTOs**

```bash
git add services/market/src/admin/dto/
git commit -m "$(cat <<'EOF'
feat(market): add admin DTOs

- VerifyListingDto (approve/reject action)
- FeatureListingDto (featured toggle with expiry)
- QueryAdminListingsDto (admin listing filters)
- AdminStatsDto and ModerationQueueDto interfaces
EOF
)"
```

---

## Task 2: Add ListingsService Admin Methods - Tests First

**Files:**
- Modify: `services/market/src/listings/listings.service.spec.ts`

- [ ] **Step 1: Add test imports and mock for verify**

Add to the imports at the top of `listings.service.spec.ts`:

```typescript
import { EVENTS } from '@hena-wadeena/types';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Add findAllAdmin tests**

Add after the `findAll pagination` describe block:

```typescript
  // -------------------------------------------------------------------------
  // findAllAdmin — bypasses status filter
  // -------------------------------------------------------------------------

  describe('findAllAdmin', () => {
    beforeEach(() => {
      vi.spyOn(service as any, 'countListings').mockResolvedValue(50);
    });

    it('should return listings regardless of status', async () => {
      const draftListing = { ...mockListing, status: 'draft' as const };
      mockDb.offset.mockResolvedValueOnce([draftListing]);

      const result = await service.findAllAdmin({ offset: 0, limit: 20 });

      expect(result.data).toEqual([draftListing]);
    });

    it('should filter by status when provided', async () => {
      mockDb.offset.mockResolvedValueOnce([]);

      await service.findAllAdmin({ offset: 0, limit: 20, status: 'draft' });

      // Verify where() was called (filter applied)
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter by is_verified when provided', async () => {
      mockDb.offset.mockResolvedValueOnce([]);

      await service.findAllAdmin({ offset: 0, limit: 20, is_verified: true });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter by owner_id when provided', async () => {
      mockDb.offset.mockResolvedValueOnce([]);

      await service.findAllAdmin({ offset: 0, limit: 20, owner_id: 'owner-uuid-001' });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return paginated response', async () => {
      mockDb.offset.mockResolvedValueOnce([mockListing]);

      const result = await service.findAllAdmin({ offset: 0, limit: 20 });

      expect(result.page).toBe(1);
      expect(result.total).toBe(50);
      expect(result.limit).toBe(20);
    });
  });
```

- [ ] **Step 3: Add verify tests**

```typescript
  // -------------------------------------------------------------------------
  // verify — admin approve/reject
  // -------------------------------------------------------------------------

  describe('verify', () => {
    it('should approve a draft listing and emit event', async () => {
      const draftListing = { ...mockListing, status: 'draft' as const, isVerified: false };
      mockDb.limit.mockResolvedValueOnce([draftListing]);
      const approvedListing = {
        ...draftListing,
        status: 'active' as const,
        isVerified: true,
        approvedBy: 'admin-uuid-001',
        approvedAt: expect.any(Date),
      };
      mockDb.returning.mockResolvedValueOnce([approvedListing]);

      const result = await service.verify(
        draftListing.id,
        { action: 'approve' },
        'admin-uuid-001',
      );

      expect(result.status).toBe('active');
      expect(result.isVerified).toBe(true);
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        EVENTS.LISTING_VERIFIED,
        expect.objectContaining({
          listingId: draftListing.id,
          verifiedBy: 'admin-uuid-001',
        }),
      );
    });

    it('should reject a listing without emitting event', async () => {
      const draftListing = { ...mockListing, status: 'draft' as const };
      mockDb.limit.mockResolvedValueOnce([draftListing]);
      const rejectedListing = { ...draftListing, status: 'suspended' as const };
      mockDb.returning.mockResolvedValueOnce([rejectedListing]);

      const result = await service.verify(
        draftListing.id,
        { action: 'reject', reason: 'Incomplete information' },
        'admin-uuid-001',
      );

      expect(result.status).toBe('suspended');
      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.verify('nonexistent-id', { action: 'approve' }, 'admin-uuid-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should be idempotent when approving an already active listing', async () => {
      const activeListing = { ...mockListing, status: 'active' as const, isVerified: true };
      mockDb.limit.mockResolvedValueOnce([activeListing]);
      mockDb.returning.mockResolvedValueOnce([activeListing]);

      const result = await service.verify(
        activeListing.id,
        { action: 'approve' },
        'admin-uuid-001',
      );

      expect(result.status).toBe('active');
      expect(mockRedisStreams.publish).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 4: Add setFeatured tests**

```typescript
  // -------------------------------------------------------------------------
  // setFeatured — admin toggle
  // -------------------------------------------------------------------------

  describe('setFeatured', () => {
    it('should set isFeatured to true', async () => {
      mockDb.limit.mockResolvedValueOnce([mockListing]);
      const featuredListing = { ...mockListing, isFeatured: true };
      mockDb.returning.mockResolvedValueOnce([featuredListing]);

      const result = await service.setFeatured(mockListing.id, { featured: true });

      expect(result.isFeatured).toBe(true);
    });

    it('should set isFeatured to false', async () => {
      const featuredListing = { ...mockListing, isFeatured: true };
      mockDb.limit.mockResolvedValueOnce([featuredListing]);
      const unfeaturedListing = { ...featuredListing, isFeatured: false };
      mockDb.returning.mockResolvedValueOnce([unfeaturedListing]);

      const result = await service.setFeatured(featuredListing.id, { featured: false });

      expect(result.isFeatured).toBe(false);
    });

    it('should set featuredUntil when provided', async () => {
      mockDb.limit.mockResolvedValueOnce([mockListing]);
      const expiryDate = new Date('2026-12-31');
      const featuredListing = { ...mockListing, isFeatured: true, featuredUntil: expiryDate };
      mockDb.returning.mockResolvedValueOnce([featuredListing]);

      const result = await service.setFeatured(mockListing.id, {
        featured: true,
        featuredUntil: expiryDate,
      });

      expect(result.featuredUntil).toEqual(expiryDate);
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.setFeatured('nonexistent-id', { featured: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `pnpm --filter @hena-wadeena/market test -- --run`

Expected: Tests fail with "service.findAllAdmin is not a function" (or similar)

- [ ] **Step 6: Commit failing tests**

```bash
git add services/market/src/listings/listings.service.spec.ts
git commit -m "$(cat <<'EOF'
test(market): add failing tests for admin listing methods

- findAllAdmin (bypass status filter, admin filters)
- verify (approve/reject with event emission)
- setFeatured (toggle with expiry)
EOF
)"
```

---

## Task 3: Implement ListingsService Admin Methods

**Files:**
- Modify: `services/market/src/listings/listings.service.ts`

- [ ] **Step 1: Add imports for admin DTOs**

Add to imports at the top of `listings.service.ts`:

```typescript
import type { FeatureListingDto } from '../admin/dto/feature-listing.dto';
import type { QueryAdminListingsDto } from '../admin/dto/query-admin-listings.dto';
import type { VerifyListingDto } from '../admin/dto/verify-listing.dto';
```

- [ ] **Step 2: Add buildAdminFilters private method**

Add after the existing `buildFilters` method:

```typescript
  private buildAdminFilters(query: QueryAdminListingsDto): SQL {
    const conditions: SQL[] = [isNull(listings.deletedAt)];

    if (query.status !== undefined) {
      conditions.push(eq(listings.status, query.status));
    }
    if (query.is_verified !== undefined) {
      conditions.push(eq(listings.isVerified, query.is_verified));
    }
    if (query.is_featured !== undefined) {
      conditions.push(eq(listings.isFeatured, query.is_featured));
    }
    if (query.owner_id !== undefined) {
      conditions.push(eq(listings.ownerId, query.owner_id));
    }

    return andRequired(...conditions);
  }
```

- [ ] **Step 3: Add findAllAdmin method**

Add after the existing `findAll` method:

```typescript
  async findAllAdmin(query: QueryAdminListingsDto): Promise<PaginatedResponse<Listing>> {
    const filters = this.buildAdminFilters(query);
    const orderBy = this.buildSort(query.sort);

    const [results, total] = await Promise.all([
      this.db
        .select(listingColumns)
        .from(listings)
        .where(filters)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.countListings(filters),
    ]);

    return paginate(results, total, query.offset, query.limit);
  }
```

- [ ] **Step 4: Add verify method**

Add after `findAllAdmin`:

```typescript
  async verify(id: string, dto: VerifyListingDto, adminId: string): Promise<Listing> {
    const listing = await this.findRaw(id);
    if (!listing) throw new NotFoundException('Listing not found');

    if (dto.action === 'approve') {
      const [updated] = await this.db
        .update(listings)
        .set({
          status: 'active',
          isVerified: true,
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
        .returning();

      if (!updated) throw new NotFoundException('Listing not found');

      this.redisStreams
        .publish(EVENTS.LISTING_VERIFIED, {
          listingId: updated.id,
          titleAr: updated.titleAr,
          titleEn: updated.titleEn ?? '',
          category: updated.category,
          district: updated.district ?? '',
          ownerId: updated.ownerId,
          verifiedBy: adminId,
          verifiedAt: updated.approvedAt?.toISOString() ?? new Date().toISOString(),
        })
        .catch((err: unknown) => {
          this.logger.error(`Failed to publish ${EVENTS.LISTING_VERIFIED}`, err);
        });

      return updated;
    }

    // Reject action
    const [updated] = await this.db
      .update(listings)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException('Listing not found');
    return updated;
  }
```

- [ ] **Step 5: Add setFeatured method**

Add after `verify`:

```typescript
  async setFeatured(id: string, dto: FeatureListingDto): Promise<Listing> {
    const listing = await this.findRaw(id);
    if (!listing) throw new NotFoundException('Listing not found');

    const [updated] = await this.db
      .update(listings)
      .set({
        isFeatured: dto.featured,
        featuredUntil: dto.featuredUntil ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException('Listing not found');
    return updated;
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @hena-wadeena/market test -- --run`

Expected: All tests pass

- [ ] **Step 7: Commit implementation**

```bash
git add services/market/src/listings/listings.service.ts
git commit -m "$(cat <<'EOF'
feat(market): implement admin listing methods

- findAllAdmin: list all listings bypassing status filter
- verify: approve/reject listing with event emission
- setFeatured: toggle featured status with expiry
EOF
)"
```

---

## Task 4: Create AdminService - Tests First

**Files:**
- Create: `services/market/src/admin/admin.service.spec.ts`

- [ ] **Step 1: Create admin.service.spec.ts**

```typescript
// services/market/src/admin/admin.service.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    service = new AdminService(mockDb as never);
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      // Mock listing stats
      mockDb.orderBy.mockResolvedValueOnce([
        { status: 'draft', count: 5 },
        { status: 'active', count: 20 },
        { status: 'suspended', count: 2 },
      ]);
      // Mock verified count
      mockDb.orderBy.mockResolvedValueOnce([{ count: 18 }]);
      // Mock featured count
      mockDb.orderBy.mockResolvedValueOnce([{ count: 3 }]);
      // Mock review stats
      mockDb.orderBy.mockResolvedValueOnce([{ total: 50, averageRating: 4.2 }]);
      // Mock opportunity count
      mockDb.orderBy.mockResolvedValueOnce([{ count: 10 }]);
      // Mock application stats
      mockDb.orderBy.mockResolvedValueOnce([
        { status: 'pending', count: 5 },
        { status: 'reviewed', count: 3 },
        { status: 'accepted', count: 8 },
        { status: 'rejected', count: 2 },
      ]);
      // Mock business stats
      mockDb.orderBy.mockResolvedValueOnce([
        { isVerified: true, count: 15 },
        { isVerified: false, count: 5 },
      ]);
      // Mock commodity stats
      mockDb.orderBy.mockResolvedValueOnce([{ commodities: 8, prices: 24 }]);

      const result = await service.getStats();

      expect(result.listings.total).toBe(27);
      expect(result.listings.draft).toBe(5);
      expect(result.listings.active).toBe(20);
      expect(result.reviews.total).toBe(50);
      expect(result.investments.opportunities).toBe(10);
      expect(result.businesses.total).toBe(20);
    });
  });

  describe('getModerationQueue', () => {
    it('should return pending items from all domains', async () => {
      // Mock draft listings
      mockDb.orderBy.mockResolvedValueOnce([
        { id: 'listing-1', titleAr: 'عقار', titleEn: 'Property', ownerId: 'user-1', createdAt: new Date() },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([{ count: 1 }]);
      // Mock unverified businesses
      mockDb.orderBy.mockResolvedValueOnce([
        { id: 'biz-1', nameAr: 'شركة', nameEn: 'Company', ownerId: 'user-2', createdAt: new Date() },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([{ count: 1 }]);
      // Mock review-status opportunities
      mockDb.orderBy.mockResolvedValueOnce([
        { id: 'opp-1', titleAr: 'فرصة', titleEn: 'Opportunity', sector: 'agriculture', ownerId: 'user-3', createdAt: new Date() },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getModerationQueue();

      expect(result.listings.count).toBe(1);
      expect(result.listings.items).toHaveLength(1);
      expect(result.businesses.count).toBe(1);
      expect(result.investments.count).toBe(1);
      expect(result.totalPending).toBe(3);
    });

    it('should return empty arrays when no pending items', async () => {
      mockDb.orderBy.mockResolvedValue([]);

      const result = await service.getModerationQueue();

      expect(result.listings.items).toHaveLength(0);
      expect(result.businesses.items).toHaveLength(0);
      expect(result.investments.items).toHaveLength(0);
      expect(result.totalPending).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @hena-wadeena/market test -- --run admin.service.spec.ts`

Expected: Cannot find module './admin.service'

- [ ] **Step 3: Commit failing tests**

```bash
git add services/market/src/admin/admin.service.spec.ts
git commit -m "$(cat <<'EOF'
test(market): add failing tests for AdminService

- getStats: aggregated statistics
- getModerationQueue: pending content queue
EOF
)"
```

---

## Task 5: Implement AdminService

**Files:**
- Create: `services/market/src/admin/admin.service.ts`

- [ ] **Step 1: Create admin.service.ts**

```typescript
// services/market/src/admin/admin.service.ts
import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { businessDirectories } from '../db/schema/business-directories';
import { commodities } from '../db/schema/commodities';
import { commodityPrices } from '../db/schema/commodity-prices';
import { investmentApplications } from '../db/schema/investment-applications';
import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { listings } from '../db/schema/listings';
import { reviews } from '../db/schema/reviews';

import type {
  AdminStatsDto,
  BusinessModerationItem,
  InvestmentModerationItem,
  ModerationItem,
  ModerationQueueDto,
} from './dto/admin-stats.dto';

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats(): Promise<AdminStatsDto> {
    const [
      listingStatusCounts,
      [verifiedCount],
      [featuredCount],
      [reviewStats],
      [opportunityCount],
      applicationStatusCounts,
      businessVerifiedCounts,
      [commodityStats],
    ] = await Promise.all([
      // Listing counts by status
      this.db
        .select({
          status: listings.status,
          count: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(isNull(listings.deletedAt))
        .groupBy(listings.status),
      // Verified listings count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.isVerified, true)),
      // Featured listings count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.isFeatured, true)),
      // Review stats
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          averageRating: sql<number>`coalesce(avg(${reviews.rating})::numeric(2,1), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.isActive, true)),
      // Opportunity count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentOpportunities),
      // Application counts by status
      this.db
        .select({
          status: investmentApplications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(investmentApplications)
        .groupBy(investmentApplications.status),
      // Business verified counts
      this.db
        .select({
          isVerified: businessDirectories.isVerified,
          count: sql<number>`count(*)::int`,
        })
        .from(businessDirectories)
        .where(isNull(businessDirectories.deletedAt))
        .groupBy(businessDirectories.isVerified),
      // Commodity stats
      this.db
        .select({
          commodities: sql<number>`(SELECT count(*)::int FROM ${commodities} WHERE ${commodities.isActive} = true)`,
          prices: sql<number>`count(*)::int`,
        })
        .from(commodityPrices),
    ]);

    // Aggregate listing stats
    const listingStats = {
      total: 0,
      draft: 0,
      active: 0,
      suspended: 0,
      verified: verifiedCount?.count ?? 0,
      featured: featuredCount?.count ?? 0,
    };
    for (const row of listingStatusCounts) {
      listingStats.total += row.count;
      if (row.status === 'draft') listingStats.draft = row.count;
      if (row.status === 'active') listingStats.active = row.count;
      if (row.status === 'suspended') listingStats.suspended = row.count;
    }

    // Aggregate application stats
    const applicationStats = { total: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
    for (const row of applicationStatusCounts) {
      applicationStats.total += row.count;
      if (row.status === 'pending') applicationStats.pending = row.count;
      if (row.status === 'reviewed') applicationStats.reviewed = row.count;
      if (row.status === 'accepted') applicationStats.accepted = row.count;
      if (row.status === 'rejected') applicationStats.rejected = row.count;
    }

    // Aggregate business stats
    const businessStats = { total: 0, verified: 0, pending: 0 };
    for (const row of businessVerifiedCounts) {
      businessStats.total += row.count;
      if (row.isVerified) businessStats.verified = row.count;
      else businessStats.pending = row.count;
    }

    return {
      listings: listingStats,
      reviews: {
        total: reviewStats?.total ?? 0,
        averageRating: Number(reviewStats?.averageRating ?? 0),
      },
      investments: {
        opportunities: opportunityCount?.count ?? 0,
        applications: applicationStats,
      },
      businesses: businessStats,
      commodities: {
        total: commodityStats?.commodities ?? 0,
        activePrices: commodityStats?.prices ?? 0,
      },
    };
  }

  async getModerationQueue(): Promise<ModerationQueueDto> {
    const [
      draftListings,
      [listingCount],
      unverifiedBusinesses,
      [businessCount],
      reviewOpportunities,
      [opportunityCount],
    ] = await Promise.all([
      // Draft listings (limit 10)
      this.db
        .select({
          id: listings.id,
          titleAr: listings.titleAr,
          titleEn: listings.titleEn,
          ownerId: listings.ownerId,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(eq(listings.status, 'draft'))
        .orderBy(listings.createdAt)
        .limit(10),
      // Draft listings count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.status, 'draft')),
      // Unverified businesses (limit 10)
      this.db
        .select({
          id: businessDirectories.id,
          nameAr: businessDirectories.nameAr,
          nameEn: businessDirectories.nameEn,
          ownerId: businessDirectories.ownerId,
          createdAt: businessDirectories.createdAt,
        })
        .from(businessDirectories)
        .where(eq(businessDirectories.isVerified, false))
        .orderBy(businessDirectories.createdAt)
        .limit(10),
      // Unverified businesses count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(businessDirectories)
        .where(eq(businessDirectories.isVerified, false)),
      // Review-status opportunities (limit 10)
      this.db
        .select({
          id: investmentOpportunities.id,
          titleAr: investmentOpportunities.titleAr,
          titleEn: investmentOpportunities.titleEn,
          sector: investmentOpportunities.sector,
          ownerId: investmentOpportunities.ownerId,
          createdAt: investmentOpportunities.createdAt,
        })
        .from(investmentOpportunities)
        .where(eq(investmentOpportunities.status, 'review'))
        .orderBy(investmentOpportunities.createdAt)
        .limit(10),
      // Review-status opportunities count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentOpportunities)
        .where(eq(investmentOpportunities.status, 'review')),
    ]);

    const listingItems: ModerationItem[] = draftListings.map((l) => ({
      id: l.id,
      titleAr: l.titleAr,
      titleEn: l.titleEn,
      ownerId: l.ownerId,
      createdAt: l.createdAt.toISOString(),
    }));

    const businessItems: BusinessModerationItem[] = unverifiedBusinesses.map((b) => ({
      id: b.id,
      nameAr: b.nameAr,
      nameEn: b.nameEn,
      ownerId: b.ownerId,
      createdAt: b.createdAt.toISOString(),
    }));

    const investmentItems: InvestmentModerationItem[] = reviewOpportunities.map((o) => ({
      id: o.id,
      titleAr: o.titleAr,
      titleEn: o.titleEn,
      sector: o.sector,
      ownerId: o.ownerId,
      createdAt: o.createdAt.toISOString(),
    }));

    const listingsCount = listingCount?.count ?? 0;
    const businessesCount = businessCount?.count ?? 0;
    const opportunitiesCount = opportunityCount?.count ?? 0;

    return {
      listings: { count: listingsCount, items: listingItems },
      businesses: { count: businessesCount, items: businessItems },
      investments: { count: opportunitiesCount, items: investmentItems },
      totalPending: listingsCount + businessesCount + opportunitiesCount,
    };
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter @hena-wadeena/market test -- --run admin.service.spec.ts`

Expected: All tests pass

- [ ] **Step 3: Commit implementation**

```bash
git add services/market/src/admin/admin.service.ts
git commit -m "$(cat <<'EOF'
feat(market): implement AdminService

- getStats: aggregated platform statistics
- getModerationQueue: pending content queue
EOF
)"
```

---

## Task 6: Create AdminController

**Files:**
- Create: `services/market/src/admin/admin.controller.ts`

- [ ] **Step 1: Create admin.controller.ts**

```typescript
// services/market/src/admin/admin.controller.ts
import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { ListingsService } from '../listings/listings.service';

import { AdminService } from './admin.service';
import { FeatureListingDto } from './dto/feature-listing.dto';
import { QueryAdminListingsDto } from './dto/query-admin-listings.dto';
import { VerifyListingDto } from './dto/verify-listing.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(ListingsService) private readonly listingsService: ListingsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('listings')
  getListings(@Query() query: QueryAdminListingsDto) {
    return this.listingsService.findAllAdmin(query);
  }

  @Patch('listings/:id/verify')
  verifyListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyListingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listingsService.verify(id, dto, user.sub);
  }

  @Patch('listings/:id/feature')
  featureListing(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FeatureListingDto) {
    return this.listingsService.setFeatured(id, dto);
  }

  @Get('moderation/queue')
  getModerationQueue() {
    return this.adminService.getModerationQueue();
  }
}
```

- [ ] **Step 2: Commit controller**

```bash
git add services/market/src/admin/admin.controller.ts
git commit -m "$(cat <<'EOF'
feat(market): add AdminController

5 endpoints:
- GET /admin/stats
- GET /admin/listings
- PATCH /admin/listings/:id/verify
- PATCH /admin/listings/:id/feature
- GET /admin/moderation/queue
EOF
)"
```

---

## Task 7: Create AdminModule and Wire Into AppModule

**Files:**
- Create: `services/market/src/admin/admin.module.ts`
- Modify: `services/market/src/app.module.ts`

- [ ] **Step 1: Create admin.module.ts**

```typescript
// services/market/src/admin/admin.module.ts
import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ListingsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

- [ ] **Step 2: Create admin index file**

```typescript
// services/market/src/admin/index.ts
export * from './admin.module';
export * from './admin.controller';
export * from './admin.service';
export * from './dto';
```

- [ ] **Step 3: Add AdminModule to AppModule imports**

In `services/market/src/app.module.ts`, add import and module:

```typescript
// Add to imports at top
import { AdminModule } from './admin/admin.module';

// Add to @Module imports array
@Module({
  imports: [
    // ... existing imports
    AdminModule,
  ],
  // ...
})
```

- [ ] **Step 4: Run full test suite**

Run: `pnpm --filter @hena-wadeena/market test -- --run`

Expected: All tests pass

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @hena-wadeena/market typecheck`

Expected: No type errors

- [ ] **Step 6: Commit module wiring**

```bash
git add services/market/src/admin/ services/market/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat(market): wire AdminModule into AppModule

Completes T30 Admin: Market feature
EOF
)"
```

---

## Task 8: Manual Verification

- [ ] **Step 1: Start the Market service**

Run: `pnpm --filter @hena-wadeena/market dev`

- [ ] **Step 2: Test endpoints with curl (requires admin JWT)**

```bash
# Get stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8002/api/v1/admin/stats

# Get all listings
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8002/api/v1/admin/listings

# Get moderation queue
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8002/api/v1/admin/moderation/queue
```

- [ ] **Step 3: Verify non-admin gets 403**

```bash
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:8002/api/v1/admin/stats
# Expected: 403 Forbidden
```

- [ ] **Step 4: Final commit with all verification**

```bash
git add -A
git status  # Verify no untracked files missed
# If all good, no additional commit needed
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create Admin DTOs | `admin/dto/*.ts` |
| 2 | Add ListingsService tests | `listings.service.spec.ts` |
| 3 | Implement ListingsService methods | `listings.service.ts` |
| 4 | Add AdminService tests | `admin.service.spec.ts` |
| 5 | Implement AdminService | `admin.service.ts` |
| 6 | Create AdminController | `admin.controller.ts` |
| 7 | Wire AdminModule | `admin.module.ts`, `app.module.ts` |
| 8 | Manual verification | curl tests |
