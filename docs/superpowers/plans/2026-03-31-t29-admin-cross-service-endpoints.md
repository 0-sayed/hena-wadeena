# T29: Admin Cross-Service Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cross-service admin endpoints for platform stats aggregation and unified moderation queue.

**Architecture:** Market service acts as the admin hub, fanning out to Identity, Guide-Booking, and Map services via HTTP calls to `/internal/stats` and `/internal/moderation` endpoints. Each service exposes its own stats and moderation data through internal-only routes protected by `InternalGuard`.

**Tech Stack:** NestJS, Drizzle ORM, `@nestjs/axios` HttpModule, Redis caching

**Note:** KYC workflow (events + notifications) is already complete in `services/identity/src/kyc/kyc.service.ts` — no changes needed there.

---

## File Structure

### New Files

```
services/identity/src/
├── stats/
│   ├── stats.module.ts
│   ├── stats.service.ts
│   └── stats.controller.ts
├── moderation/
│   ├── moderation.module.ts
│   └── moderation.controller.ts

services/market/src/
├── stats/
│   ├── stats.module.ts
│   ├── stats.service.ts
│   └── stats.controller.ts
├── admin/
│   ├── admin.module.ts
│   ├── admin-stats.controller.ts
│   ├── admin-stats.service.ts
│   ├── admin-moderation.controller.ts
│   ├── admin-moderation.service.ts
│   ├── services.config.ts
│   └── dto/
│       ├── admin-stats.dto.ts
│       └── moderation-query.dto.ts

services/map/src/
├── moderation/
│   ├── moderation.module.ts
│   └── moderation.controller.ts
```

### Modified Files

```
services/identity/src/app.module.ts      # Add StatsModule, ModerationModule
services/market/src/app.module.ts        # Add StatsModule, AdminModule
services/map/src/app.module.ts           # Add ModerationModule
```

---

## Task 1: Identity Stats Service

**Files:**
- Create: `services/identity/src/stats/stats.service.ts`
- Create: `services/identity/src/stats/stats.controller.ts`
- Create: `services/identity/src/stats/stats.module.ts`
- Modify: `services/identity/src/app.module.ts`
- Test: `services/identity/src/stats/stats.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `services/identity/src/stats/stats.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';

import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let mockDb: { select: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
    };

    const module = await Test.createTestingModule({
      providers: [StatsService, { provide: DRIZZLE_CLIENT, useValue: mockDb }],
    }).compile();

    service = module.get(StatsService);
  });

  it('should return stats with user and kyc counts', async () => {
    // Mock chain for users query
    const usersChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        { total: 100, active: 90, suspended: 8, banned: 2 },
      ]),
    };

    // Mock chain for users by role
    const roleChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockResolvedValue([
        { role: 'tourist', count: 50 },
        { role: 'merchant', count: 30 },
        { role: 'admin', count: 5 },
      ]),
    };

    // Mock chain for new users
    const newUsersChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ count: 15 }]),
    };

    // Mock chain for KYC
    const kycChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        { total: 25, pending: 5, approved: 18, rejected: 2 },
      ]),
    };

    mockDb.select
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(roleChain)
      .mockReturnValueOnce(newUsersChain)
      .mockReturnValueOnce(kycChain);

    const result = await service.getStats();

    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('kyc');
    expect(result.users).toHaveProperty('total');
    expect(result.users).toHaveProperty('byStatus');
    expect(result.users).toHaveProperty('byRole');
    expect(result.kyc).toHaveProperty('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @hena-wadeena/identity test -- stats.service.spec.ts`
Expected: FAIL with "Cannot find module './stats.service'"

- [ ] **Step 3: Create StatsService**

Create `services/identity/src/stats/stats.service.ts`:

```typescript
import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { count, eq, gte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { users } from '../db/schema/users';
import { userKyc } from '../db/schema/user-kyc';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      [statusStats],
      roleStats,
      [newUsersStats],
      [kycStats],
    ] = await Promise.all([
      // User counts by status
      this.db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${users.status} = 'active' THEN 1 END`),
          suspended: count(sql`CASE WHEN ${users.status} = 'suspended' THEN 1 END`),
          banned: count(sql`CASE WHEN ${users.status} = 'banned' THEN 1 END`),
        })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL`),

      // User counts by role
      this.db
        .select({
          role: users.role,
          count: count(),
        })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL`)
        .groupBy(users.role),

      // New users in last 30 days
      this.db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL AND ${users.createdAt} >= ${thirtyDaysAgo}`),

      // KYC stats
      this.db
        .select({
          total: count(),
          pending: count(sql`CASE WHEN ${userKyc.status} = 'pending' THEN 1 END`),
          underReview: count(sql`CASE WHEN ${userKyc.status} = 'under_review' THEN 1 END`),
          approved: count(sql`CASE WHEN ${userKyc.status} = 'approved' THEN 1 END`),
          rejected: count(sql`CASE WHEN ${userKyc.status} = 'rejected' THEN 1 END`),
        })
        .from(userKyc),
    ]);

    const byRole: Record<string, number> = {};
    for (const row of roleStats) {
      byRole[row.role] = row.count;
    }

    return {
      users: {
        total: statusStats?.total ?? 0,
        byStatus: {
          active: statusStats?.active ?? 0,
          suspended: statusStats?.suspended ?? 0,
          banned: statusStats?.banned ?? 0,
        },
        byRole,
        newLast30Days: newUsersStats?.count ?? 0,
      },
      kyc: {
        total: kycStats?.total ?? 0,
        pending: kycStats?.pending ?? 0,
        underReview: kycStats?.underReview ?? 0,
        approved: kycStats?.approved ?? 0,
        rejected: kycStats?.rejected ?? 0,
      },
    };
  }
}
```

- [ ] **Step 4: Create StatsController**

Create `services/identity/src/stats/stats.controller.ts`:

```typescript
import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { StatsService } from './stats.service';

@Controller('internal/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  getStats() {
    return this.statsService.getStats();
  }
}
```

- [ ] **Step 5: Create StatsModule**

Create `services/identity/src/stats/stats.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
```

- [ ] **Step 6: Register module in AppModule**

Modify `services/identity/src/app.module.ts`:

Add import at top:
```typescript
import { StatsModule } from './stats/stats.module';
```

Add `StatsModule` to the imports array after `SearchModule`.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @hena-wadeena/identity test -- stats.service.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add services/identity/src/stats/
git add services/identity/src/app.module.ts
git commit -m "feat(identity): add internal stats endpoint

- GET /internal/stats returns user counts by role/status
- Includes KYC submission statistics
- Protected by InternalGuard"
```

---

## Task 2: Identity Moderation Endpoint

**Files:**
- Create: `services/identity/src/moderation/moderation.controller.ts`
- Create: `services/identity/src/moderation/moderation.module.ts`
- Modify: `services/identity/src/app.module.ts`

- [ ] **Step 1: Create ModerationController**

Create `services/identity/src/moderation/moderation.controller.ts`:

```typescript
import { DRIZZLE_CLIENT, InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { userKyc } from '../db/schema/user-kyc';
import { users } from '../db/schema/users';

@Controller('internal/moderation')
export class ModerationController {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async getPendingItems() {
    const pendingKyc = await this.db
      .select({
        id: userKyc.id,
        userId: userKyc.userId,
        userName: users.fullName,
        userEmail: users.email,
        docType: userKyc.docType,
        docUrl: userKyc.docUrl,
        status: userKyc.status,
        createdAt: userKyc.createdAt,
      })
      .from(userKyc)
      .innerJoin(users, eq(userKyc.userId, users.id))
      .where(eq(userKyc.status, 'pending'))
      .orderBy(userKyc.createdAt);

    return {
      data: pendingKyc.map((item) => ({
        id: item.id,
        type: 'kyc' as const,
        title: item.userName,
        description: `${item.docType} verification`,
        status: item.status,
        createdAt: item.createdAt,
        createdBy: {
          id: item.userId,
          name: item.userName,
          email: item.userEmail,
        },
      })),
    };
  }
}
```

- [ ] **Step 2: Create ModerationModule**

Create `services/identity/src/moderation/moderation.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { ModerationController } from './moderation.controller';

@Module({
  controllers: [ModerationController],
})
export class ModerationModule {}
```

- [ ] **Step 3: Register in AppModule**

Modify `services/identity/src/app.module.ts`:

Add import:
```typescript
import { ModerationModule } from './moderation/moderation.module';
```

Add `ModerationModule` to imports array.

- [ ] **Step 4: Test manually**

Run: `pnpm --filter @hena-wadeena/identity dev`

Then in another terminal:
```bash
curl -H "x-internal-secret: ${INTERNAL_SECRET:-dev-secret}" \
  http://localhost:8001/api/v1/internal/moderation
```

Expected: JSON with `data` array of pending KYC items

- [ ] **Step 5: Commit**

```bash
git add services/identity/src/moderation/
git add services/identity/src/app.module.ts
git commit -m "feat(identity): add internal moderation endpoint for pending KYC"
```

---

## Task 3: Market Stats Service

**Files:**
- Create: `services/market/src/stats/stats.service.ts`
- Create: `services/market/src/stats/stats.controller.ts`
- Create: `services/market/src/stats/stats.module.ts`
- Modify: `services/market/src/app.module.ts`

- [ ] **Step 1: Create StatsService**

Create `services/market/src/stats/stats.service.ts`:

```typescript
import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { listings } from '../db/schema/listings';
import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { investmentApplications } from '../db/schema/investment-applications';
import { reviews } from '../db/schema/reviews';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats() {
    const [
      [listingStats],
      [investmentStats],
      [applicationStats],
      [reviewStats],
    ] = await Promise.all([
      // Listing stats
      this.db
        .select({
          total: count(),
          verified: count(sql`CASE WHEN ${listings.isVerified} = true THEN 1 END`),
          unverified: count(sql`CASE WHEN ${listings.isVerified} = false THEN 1 END`),
          featured: count(sql`CASE WHEN ${listings.isFeatured} = true THEN 1 END`),
          draft: count(sql`CASE WHEN ${listings.status} = 'draft' THEN 1 END`),
          active: count(sql`CASE WHEN ${listings.status} = 'active' THEN 1 END`),
          suspended: count(sql`CASE WHEN ${listings.status} = 'suspended' THEN 1 END`),
        })
        .from(listings)
        .where(sql`${listings.deletedAt} IS NULL`),

      // Investment opportunity stats
      this.db
        .select({
          total: count(),
          draft: count(sql`CASE WHEN ${investmentOpportunities.status} = 'draft' THEN 1 END`),
          review: count(sql`CASE WHEN ${investmentOpportunities.status} = 'review' THEN 1 END`),
          active: count(sql`CASE WHEN ${investmentOpportunities.status} = 'active' THEN 1 END`),
          closed: count(sql`CASE WHEN ${investmentOpportunities.status} = 'closed' THEN 1 END`),
          taken: count(sql`CASE WHEN ${investmentOpportunities.status} = 'taken' THEN 1 END`),
          verified: count(sql`CASE WHEN ${investmentOpportunities.isVerified} = true THEN 1 END`),
        })
        .from(investmentOpportunities),

      // Total investment applications
      this.db.select({ total: count() }).from(investmentApplications),

      // Review stats
      this.db
        .select({
          total: count(),
          averageRating: sql<number>`COALESCE(ROUND(AVG(${reviews.rating})::numeric, 1), 0)::float`,
        })
        .from(reviews)
        .where(eq(reviews.isActive, true)),
    ]);

    return {
      listings: {
        total: listingStats?.total ?? 0,
        verified: listingStats?.verified ?? 0,
        unverified: listingStats?.unverified ?? 0,
        featured: listingStats?.featured ?? 0,
        byStatus: {
          draft: listingStats?.draft ?? 0,
          active: listingStats?.active ?? 0,
          suspended: listingStats?.suspended ?? 0,
        },
      },
      investments: {
        total: investmentStats?.total ?? 0,
        verified: investmentStats?.verified ?? 0,
        byStatus: {
          draft: investmentStats?.draft ?? 0,
          review: investmentStats?.review ?? 0,
          active: investmentStats?.active ?? 0,
          closed: investmentStats?.closed ?? 0,
          taken: investmentStats?.taken ?? 0,
        },
        totalApplications: applicationStats?.total ?? 0,
      },
      reviews: {
        total: reviewStats?.total ?? 0,
        averageRating: reviewStats?.averageRating ?? 0,
      },
    };
  }
}
```

- [ ] **Step 2: Create StatsController**

Create `services/market/src/stats/stats.controller.ts`:

```typescript
import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { StatsService } from './stats.service';

@Controller('internal/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  getStats() {
    return this.statsService.getStats();
  }
}
```

- [ ] **Step 3: Create StatsModule**

Create `services/market/src/stats/stats.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
```

- [ ] **Step 4: Register in AppModule**

Modify `services/market/src/app.module.ts`:

Add import:
```typescript
import { StatsModule } from './stats/stats.module';
```

Add `StatsModule` to imports array.

- [ ] **Step 5: Test manually**

Run: `pnpm --filter @hena-wadeena/market dev`

```bash
curl -H "x-internal-secret: ${INTERNAL_SECRET:-dev-secret}" \
  http://localhost:8002/api/v1/internal/stats
```

Expected: JSON with listings, investments, reviews stats

- [ ] **Step 6: Commit**

```bash
git add services/market/src/stats/
git add services/market/src/app.module.ts
git commit -m "feat(market): add internal stats endpoint

- Returns listing, investment, review statistics
- Protected by InternalGuard"
```

---

## Task 4: Map Moderation Endpoint

**Files:**
- Create: `services/map/src/moderation/moderation.controller.ts`
- Create: `services/map/src/moderation/moderation.module.ts`
- Modify: `services/map/src/app.module.ts`

- [ ] **Step 1: Create ModerationController**

Create `services/map/src/moderation/moderation.controller.ts`:

```typescript
import { DRIZZLE_CLIENT, InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { pointsOfInterest } from '../db/schema/points-of-interest';

@Controller('internal/moderation')
export class ModerationController {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async getPendingItems() {
    const pendingPois = await this.db
      .select({
        id: pointsOfInterest.id,
        nameAr: pointsOfInterest.nameAr,
        nameEn: pointsOfInterest.nameEn,
        description: pointsOfInterest.description,
        category: pointsOfInterest.category,
        status: pointsOfInterest.status,
        submittedBy: pointsOfInterest.submittedBy,
        createdAt: pointsOfInterest.createdAt,
      })
      .from(pointsOfInterest)
      .where(eq(pointsOfInterest.status, 'pending'))
      .orderBy(pointsOfInterest.createdAt);

    return {
      data: pendingPois.map((item) => ({
        id: item.id,
        type: 'poi' as const,
        title: item.nameAr,
        description: item.description,
        status: item.status,
        category: item.category,
        createdAt: item.createdAt,
        createdBy: {
          id: item.submittedBy,
          name: null, // Would need cross-service call to get name
          email: null,
        },
      })),
    };
  }
}
```

- [ ] **Step 2: Create ModerationModule**

Create `services/map/src/moderation/moderation.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { ModerationController } from './moderation.controller';

@Module({
  controllers: [ModerationController],
})
export class ModerationModule {}
```

- [ ] **Step 3: Register in AppModule**

Modify `services/map/src/app.module.ts`:

Add import:
```typescript
import { ModerationModule } from './moderation/moderation.module';
```

Add `ModerationModule` to imports array.

- [ ] **Step 4: Test manually**

Run: `pnpm --filter @hena-wadeena/map dev`

```bash
curl -H "x-internal-secret: ${INTERNAL_SECRET:-dev-secret}" \
  http://localhost:8004/api/v1/internal/moderation
```

Expected: JSON with `data` array of pending POIs

- [ ] **Step 5: Commit**

```bash
git add services/map/src/moderation/
git add services/map/src/app.module.ts
git commit -m "feat(map): add internal moderation endpoint for pending POIs"
```

---

## Task 5: Admin Stats Aggregation Service

**Files:**
- Create: `services/market/src/admin/services.config.ts`
- Create: `services/market/src/admin/dto/admin-stats.dto.ts`
- Create: `services/market/src/admin/admin-stats.service.ts`
- Create: `services/market/src/admin/admin-stats.controller.ts`

- [ ] **Step 1: Create services config**

Create `services/market/src/admin/services.config.ts`:

```typescript
export interface AdminServiceConfig {
  name: string;
  url: string;
  statsPath: string;
  moderationPath: string | null;
}

export const ADMIN_SERVICES: AdminServiceConfig[] = [
  {
    name: 'identity',
    url: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:8001',
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
  {
    name: 'guide-booking',
    url: process.env.GUIDE_BOOKING_SERVICE_URL ?? 'http://localhost:8003',
    statsPath: '/api/v1/internal/stats',
    moderationPath: null,
  },
  {
    name: 'map',
    url: process.env.MAP_SERVICE_URL ?? 'http://localhost:8004',
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
];

export const ADMIN_STATS_CACHE_KEY = 'admin:stats';
export const ADMIN_STATS_CACHE_TTL = 60; // seconds
export const SERVICE_TIMEOUT_MS = 3000;
```

- [ ] **Step 2: Create DTO**

Create `services/market/src/admin/dto/admin-stats.dto.ts`:

```typescript
export interface AdminStatsResponse {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: {
      active: number;
      suspended: number;
      banned: number;
    };
    newLast30Days: number;
  };
  kyc: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
  listings: {
    total: number;
    verified: number;
    unverified: number;
    featured: number;
    byStatus: Record<string, number>;
  };
  investments: {
    total: number;
    verified: number;
    byStatus: Record<string, number>;
    totalApplications: number;
  };
  reviews: {
    listings: { total: number; averageRating: number };
    guides: { total: number; averageRating: number };
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  guides: {
    total: number;
    verified: number;
    active: number;
  };
  packages: {
    total: number;
    active: number;
  };
  pois: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  carpoolRides: {
    total: number;
    open: number;
    full: number;
    departed: number;
    completed: number;
    cancelled: number;
  };
  meta: {
    sources: string[];
    degraded: boolean;
    cachedAt: string | null;
  };
}
```

- [ ] **Step 3: Create AdminStatsService**

Create `services/market/src/admin/admin-stats.service.ts`:

```typescript
import { REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { StatsService } from '../stats/stats.service';

import type { AdminStatsResponse } from './dto/admin-stats.dto';
import {
  ADMIN_SERVICES,
  ADMIN_STATS_CACHE_KEY,
  ADMIN_STATS_CACHE_TTL,
  SERVICE_TIMEOUT_MS,
} from './services.config';

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly localStatsService: StatsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getAggregatedStats(): Promise<AdminStatsResponse> {
    // Check cache first
    try {
      const cached = await this.redis.get(ADMIN_STATS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AdminStatsResponse;
        return { ...parsed, meta: { ...parsed.meta, cachedAt: new Date().toISOString() } };
      }
    } catch (err) {
      this.logger.warn('Cache read failed', err);
    }

    // Fan out to all services in parallel
    const [identityResult, guideBookingResult, mapResult, localResult] = await Promise.allSettled([
      this.fetchServiceStats('identity'),
      this.fetchServiceStats('guide-booking'),
      this.fetchServiceStats('map'),
      this.localStatsService.getStats(),
    ]);

    const sources: string[] = ['market'];
    let degraded = false;

    // Extract identity stats
    let identityStats = { users: {}, kyc: {} } as Record<string, unknown>;
    if (identityResult.status === 'fulfilled' && identityResult.value) {
      identityStats = identityResult.value;
      sources.push('identity');
    } else {
      degraded = true;
      this.logger.warn('Identity stats failed', identityResult);
    }

    // Extract guide-booking stats
    let guideBookingStats = {} as Record<string, unknown>;
    if (guideBookingResult.status === 'fulfilled' && guideBookingResult.value) {
      guideBookingStats = guideBookingResult.value;
      sources.push('guide-booking');
    } else {
      degraded = true;
      this.logger.warn('Guide-booking stats failed', guideBookingResult);
    }

    // Extract map stats
    let mapStats = {} as Record<string, unknown>;
    if (mapResult.status === 'fulfilled' && mapResult.value) {
      mapStats = mapResult.value;
      sources.push('map');
    } else {
      degraded = true;
      this.logger.warn('Map stats failed', mapResult);
    }

    // Local market stats
    const marketStats = localResult.status === 'fulfilled' ? localResult.value : {};

    const response: AdminStatsResponse = {
      users: (identityStats.users as AdminStatsResponse['users']) ?? {
        total: 0,
        byRole: {},
        byStatus: { active: 0, suspended: 0, banned: 0 },
        newLast30Days: 0,
      },
      kyc: (identityStats.kyc as AdminStatsResponse['kyc']) ?? {
        total: 0,
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
      },
      listings: (marketStats as Record<string, unknown>).listings as AdminStatsResponse['listings'] ?? {
        total: 0,
        verified: 0,
        unverified: 0,
        featured: 0,
        byStatus: {},
      },
      investments: (marketStats as Record<string, unknown>).investments as AdminStatsResponse['investments'] ?? {
        total: 0,
        verified: 0,
        byStatus: {},
        totalApplications: 0,
      },
      reviews: {
        listings: (marketStats as Record<string, unknown>).reviews as { total: number; averageRating: number } ?? { total: 0, averageRating: 0 },
        guides: (guideBookingStats as Record<string, unknown>).reviews as { total: number; averageRating: number } ?? { total: 0, averageRating: 0 },
      },
      bookings: (guideBookingStats as Record<string, unknown>).bookings as AdminStatsResponse['bookings'] ?? {
        total: 0,
        pending: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      },
      guides: (guideBookingStats as Record<string, unknown>).guides as AdminStatsResponse['guides'] ?? {
        total: 0,
        verified: 0,
        active: 0,
      },
      packages: (guideBookingStats as Record<string, unknown>).packages as AdminStatsResponse['packages'] ?? {
        total: 0,
        active: 0,
      },
      pois: (mapStats as Record<string, unknown>).pois as AdminStatsResponse['pois'] ?? {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      },
      carpoolRides: (mapStats as Record<string, unknown>).carpoolRides as AdminStatsResponse['carpoolRides'] ?? {
        total: 0,
        open: 0,
        full: 0,
        departed: 0,
        completed: 0,
        cancelled: 0,
      },
      meta: {
        sources,
        degraded,
        cachedAt: null,
      },
    };

    // Cache only if not degraded
    if (!degraded) {
      this.redis
        .set(ADMIN_STATS_CACHE_KEY, JSON.stringify(response), 'EX', ADMIN_STATS_CACHE_TTL)
        .catch((err) => this.logger.warn('Cache write failed', err));
    }

    return response;
  }

  private async fetchServiceStats(serviceName: string): Promise<Record<string, unknown> | null> {
    const config = ADMIN_SERVICES.find((s) => s.name === serviceName);
    if (!config) return null;

    const url = `${config.url}${config.statsPath}`;
    const response = await firstValueFrom(
      this.httpService
        .get<Record<string, unknown>>(url, {
          headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        })
        .pipe(
          timeout(SERVICE_TIMEOUT_MS),
          catchError((err) => {
            this.logger.warn(`Stats fetch from ${serviceName} at ${url} failed: ${String(err)}`);
            return of(null);
          }),
        ),
    );

    return response?.data ?? null;
  }
}
```

- [ ] **Step 4: Create AdminStatsController**

Create `services/market/src/admin/admin-stats.controller.ts`:

```typescript
import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Controller, Get } from '@nestjs/common';

import { AdminStatsService } from './admin-stats.service';

@Controller('admin/stats')
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get()
  getStats() {
    return this.adminStatsService.getAggregatedStats();
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add services/market/src/admin/services.config.ts
git add services/market/src/admin/dto/
git add services/market/src/admin/admin-stats.service.ts
git add services/market/src/admin/admin-stats.controller.ts
git commit -m "feat(market): add admin stats aggregation service

- GET /admin/stats aggregates stats from all services
- Includes caching with 60s TTL
- Graceful degradation on service failures"
```

---

## Task 6: Admin Moderation Queue Service

**Files:**
- Create: `services/market/src/admin/dto/moderation-query.dto.ts`
- Create: `services/market/src/admin/admin-moderation.service.ts`
- Create: `services/market/src/admin/admin-moderation.controller.ts`

- [ ] **Step 1: Create DTO**

Create `services/market/src/admin/dto/moderation-query.dto.ts`:

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const moderationQuerySchema = z.object({
  type: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export class ModerationQueryDto extends createZodDto(moderationQuerySchema) {}

export interface ModerationItem {
  id: string;
  type: 'listing' | 'investment' | 'kyc' | 'poi';
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  service: 'identity' | 'market' | 'map';
  actions: {
    approve: string;
    reject: string;
    view: string;
  };
}

export interface ModerationQueueResponse {
  data: ModerationItem[];
  total: number;
  hasMore: boolean;
}
```

- [ ] **Step 2: Create AdminModerationService**

Create `services/market/src/admin/admin-moderation.service.ts`:

```typescript
import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { listings } from '../db/schema/listings';
import { investmentOpportunities } from '../db/schema/investment-opportunities';

import type { ModerationItem, ModerationQueryDto, ModerationQueueResponse } from './dto/moderation-query.dto';
import { ADMIN_SERVICES, SERVICE_TIMEOUT_MS } from './services.config';

@Injectable()
export class AdminModerationService {
  private readonly logger = new Logger(AdminModerationService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
  ) {}

  async getQueue(query: ModerationQueryDto): Promise<ModerationQueueResponse> {
    const requestedTypes = query.type as string[] | undefined;

    // Gather items from all sources in parallel
    const [localItems, identityItems, mapItems] = await Promise.all([
      this.getLocalPendingItems(requestedTypes),
      this.fetchExternalModeration('identity', requestedTypes),
      this.fetchExternalModeration('map', requestedTypes),
    ]);

    // Merge and sort by createdAt desc
    const allItems = [...localItems, ...identityItems, ...mapItems];
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter by type if requested
    const filtered = requestedTypes
      ? allItems.filter((item) => requestedTypes.includes(item.type))
      : allItems;

    // Paginate
    const paginated = filtered.slice(query.offset, query.offset + query.limit);

    return {
      data: paginated,
      total: filtered.length,
      hasMore: filtered.length > query.offset + query.limit,
    };
  }

  private async getLocalPendingItems(types?: string[]): Promise<ModerationItem[]> {
    const items: ModerationItem[] = [];

    // Unverified listings
    if (!types || types.includes('listing')) {
      const pendingListings = await this.db
        .select({
          id: listings.id,
          title: listings.titleAr,
          description: listings.description,
          status: listings.status,
          ownerId: listings.ownerId,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(sql`${listings.isVerified} = false AND ${listings.deletedAt} IS NULL AND ${listings.status} = 'active'`)
        .orderBy(listings.createdAt);

      for (const listing of pendingListings) {
        items.push({
          id: listing.id,
          type: 'listing',
          title: listing.title,
          description: listing.description,
          status: 'unverified',
          createdAt: listing.createdAt,
          createdBy: { id: listing.ownerId, name: null, email: null },
          service: 'market',
          actions: {
            approve: `PATCH /api/v1/admin/listings/${listing.id}/verify`,
            reject: `PATCH /api/v1/admin/listings/${listing.id}/verify`,
            view: `GET /api/v1/listings/${listing.id}`,
          },
        });
      }
    }

    // Investment opportunities in review
    if (!types || types.includes('investment')) {
      const pendingInvestments = await this.db
        .select({
          id: investmentOpportunities.id,
          title: investmentOpportunities.titleAr,
          description: investmentOpportunities.description,
          status: investmentOpportunities.status,
          ownerId: investmentOpportunities.ownerId,
          createdAt: investmentOpportunities.createdAt,
        })
        .from(investmentOpportunities)
        .where(eq(investmentOpportunities.status, 'review'))
        .orderBy(investmentOpportunities.createdAt);

      for (const inv of pendingInvestments) {
        items.push({
          id: inv.id,
          type: 'investment',
          title: inv.title,
          description: inv.description,
          status: inv.status,
          createdAt: inv.createdAt,
          createdBy: { id: inv.ownerId, name: null, email: null },
          service: 'market',
          actions: {
            approve: `PATCH /api/v1/admin/investments/${inv.id}/verify`,
            reject: `PATCH /api/v1/admin/investments/${inv.id}/reject`,
            view: `GET /api/v1/investments/${inv.id}`,
          },
        });
      }
    }

    return items;
  }

  private async fetchExternalModeration(
    serviceName: string,
    types?: string[],
  ): Promise<ModerationItem[]> {
    const config = ADMIN_SERVICES.find((s) => s.name === serviceName);
    if (!config?.moderationPath) return [];

    // Check if requested types include this service's types
    const serviceTypes = serviceName === 'identity' ? ['kyc'] : ['poi'];
    if (types && !serviceTypes.some((t) => types.includes(t))) {
      return [];
    }

    const url = `${config.url}${config.moderationPath}`;
    const response = await firstValueFrom(
      this.httpService
        .get<{ data: Array<Record<string, unknown>> }>(url, {
          headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        })
        .pipe(
          timeout(SERVICE_TIMEOUT_MS),
          catchError((err) => {
            this.logger.warn(`Moderation fetch from ${serviceName} failed: ${String(err)}`);
            return of(null);
          }),
        ),
    );

    if (!response?.data?.data) return [];

    return response.data.data.map((item) => ({
      id: item.id as string,
      type: item.type as ModerationItem['type'],
      title: item.title as string,
      description: (item.description as string) ?? null,
      status: item.status as string,
      createdAt: new Date(item.createdAt as string),
      createdBy: item.createdBy as ModerationItem['createdBy'],
      service: serviceName as ModerationItem['service'],
      actions: this.getActionsForType(item.type as string, item.id as string, serviceName),
    }));
  }

  private getActionsForType(type: string, id: string, service: string): ModerationItem['actions'] {
    switch (type) {
      case 'kyc':
        return {
          approve: `PATCH /api/v1/admin/kyc/${id}`,
          reject: `PATCH /api/v1/admin/kyc/${id}`,
          view: `GET /api/v1/admin/kyc/${id}`,
        };
      case 'poi':
        return {
          approve: `PATCH /api/v1/map/pois/${id}/approve`,
          reject: `PATCH /api/v1/map/pois/${id}/reject`,
          view: `GET /api/v1/map/pois/${id}`,
        };
      default:
        return { approve: '', reject: '', view: '' };
    }
  }
}
```

- [ ] **Step 3: Create AdminModerationController**

Create `services/market/src/admin/admin-moderation.controller.ts`:

```typescript
import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Controller, Get, Query } from '@nestjs/common';

import { AdminModerationService } from './admin-moderation.service';
import { ModerationQueryDto } from './dto/moderation-query.dto';

@Controller('admin/moderation')
@Roles(UserRole.ADMIN)
export class AdminModerationController {
  constructor(private readonly adminModerationService: AdminModerationService) {}

  @Get('queue')
  getQueue(@Query() query: ModerationQueryDto) {
    return this.adminModerationService.getQueue(query);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add services/market/src/admin/dto/moderation-query.dto.ts
git add services/market/src/admin/admin-moderation.service.ts
git add services/market/src/admin/admin-moderation.controller.ts
git commit -m "feat(market): add admin moderation queue endpoint

- GET /admin/moderation/queue aggregates pending items from all services
- Supports type filtering (listing, investment, kyc, poi)
- Pagination with offset/limit"
```

---

## Task 7: Admin Module Assembly

**Files:**
- Create: `services/market/src/admin/admin.module.ts`
- Modify: `services/market/src/app.module.ts`

- [ ] **Step 1: Create AdminModule**

Create `services/market/src/admin/admin.module.ts`:

```typescript
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { StatsModule } from '../stats/stats.module';

import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
      maxRedirects: 0,
    }),
    StatsModule,
  ],
  controllers: [AdminStatsController, AdminModerationController],
  providers: [AdminStatsService, AdminModerationService],
})
export class AdminModule {}
```

- [ ] **Step 2: Register in AppModule**

Modify `services/market/src/app.module.ts`:

Add import:
```typescript
import { AdminModule } from './admin/admin.module';
```

Add `AdminModule` to imports array (after `SearchModule`).

- [ ] **Step 3: Commit**

```bash
git add services/market/src/admin/admin.module.ts
git add services/market/src/app.module.ts
git commit -m "feat(market): assemble AdminModule with HttpModule

- Registers stats and moderation controllers
- Enables cross-service HTTP calls"
```

---

## Task 8: E2E Tests

**Files:**
- Create: `services/market/test/admin-stats.e2e-spec.ts`

- [ ] **Step 1: Create E2E test**

Create `services/market/test/admin-stats.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { AppModule } from '../src/app.module';

describe('Admin Stats (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get tokens from identity service (mock or real)
    // For now, we test the endpoint exists and requires auth
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /admin/stats requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .expect(401);
  });

  it('GET /admin/moderation/queue requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue')
      .expect(401);
  });
});
```

- [ ] **Step 2: Run E2E test**

Run: `pnpm --filter @hena-wadeena/market test:e2e -- admin-stats`
Expected: Tests pass (endpoints reject unauthenticated requests)

- [ ] **Step 3: Commit**

```bash
git add services/market/test/admin-stats.e2e-spec.ts
git commit -m "test(market): add admin endpoints E2E tests"
```

---

## Task 9: Final Integration Test

- [ ] **Step 1: Start all services**

```bash
# Terminal 1
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# Terminal 2
pnpm --filter @hena-wadeena/identity dev

# Terminal 3
pnpm --filter @hena-wadeena/market dev

# Terminal 4
pnpm --filter @hena-wadeena/guide-booking dev

# Terminal 5
pnpm --filter @hena-wadeena/map dev
```

- [ ] **Step 2: Test internal stats endpoints**

```bash
# Identity
curl -H "x-internal-secret: dev-secret" http://localhost:8001/api/v1/internal/stats

# Market
curl -H "x-internal-secret: dev-secret" http://localhost:8002/api/v1/internal/stats

# Guide-Booking
curl -H "x-internal-secret: dev-secret" http://localhost:8003/api/v1/internal/stats

# Map
curl -H "x-internal-secret: dev-secret" http://localhost:8004/api/v1/internal/stats
```

Expected: All return JSON with service-specific stats

- [ ] **Step 3: Test admin aggregation (requires admin JWT)**

Get an admin token via login, then:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8002/api/v1/admin/stats
```

Expected: Aggregated stats from all services

- [ ] **Step 4: Test moderation queue**

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8002/api/v1/admin/moderation/queue
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:8002/api/v1/admin/moderation/queue?type=kyc"
```

Expected: Queue returns pending items, filtered by type

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(t29): complete admin cross-service endpoints

- Identity: /internal/stats, /internal/moderation
- Market: /internal/stats, /admin/stats, /admin/moderation/queue
- Map: /internal/moderation
- Aggregation with caching and graceful degradation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Identity Stats Service | stats.service.ts, stats.controller.ts, stats.module.ts |
| 2 | Identity Moderation Endpoint | moderation.controller.ts, moderation.module.ts |
| 3 | Market Stats Service | stats.service.ts, stats.controller.ts, stats.module.ts |
| 4 | Map Moderation Endpoint | moderation.controller.ts, moderation.module.ts |
| 5 | Admin Stats Aggregation | admin-stats.service.ts, admin-stats.controller.ts |
| 6 | Admin Moderation Queue | admin-moderation.service.ts, admin-moderation.controller.ts |
| 7 | Admin Module Assembly | admin.module.ts, app.module.ts |
| 8 | E2E Tests | admin-stats.e2e-spec.ts |
| 9 | Integration Test | Manual verification |
