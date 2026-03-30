# T29: Admin Cross-Service Endpoints — Design Spec

> **Task:** T29 Admin: Cross-Service Endpoints
> **Size:** M
> **Dependencies:** T25 (Seed Data), T26 (Integration: Market), T27 (Integration: Guide + Map)
> **Date:** 2026-03-31

---

## 1. Overview

This task implements three cross-service admin capabilities:

1. **Admin Stats Aggregation** — Platform-wide dashboard endpoint that fans out to all services
2. **KYC Workflow Completion** — Events and notifications for KYC approval/rejection
3. **Moderation Queue** — Unified queue of pending content across services

## 2. Scope

### In Scope
- `/admin/stats` endpoint in Market service (cross-service aggregation)
- `/admin/moderation/queue` endpoint in Market service
- `/internal/stats` endpoints in Identity and Market (Guide-Booking and Map already have these)
- `/internal/moderation` endpoints in Identity and Map
- KYC event emission (`kyc.approved`, `kyc.rejected`)
- Redis caching for aggregated stats

### Out of Scope
- AI-based content flagging (manual/pending-status only for MVP)
- Revenue/financial metrics (payments deferred from MVP)
- Audit log (super_admin only, separate task)
- Feature flags management (super_admin only, separate task)

## 3. Architecture

### 3.1 Stats Aggregation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Request                            │
│                    GET /admin/stats                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Market Service (:8002)                      │
│                     AdminStatsService                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Check Redis cache (key: admin:stats, TTL: 60s)         │ │
│  │ 2. If miss, fan out to all services in parallel           │ │
│  │ 3. Aggregate responses                                     │ │
│  │ 4. Cache result (if not degraded)                         │ │
│  │ 5. Return unified response                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Identity │  │  Market  │  │  Guide   │  │   Map    │
    │  :8001   │  │  :8002   │  │  :8003   │  │  :8004   │
    │ /internal│  │  (local) │  │ /internal│  │ /internal│
    │  /stats  │  │          │  │  /stats  │  │  /stats  │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 3.2 Moderation Queue Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Request                            │
│              GET /admin/moderation/queue                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Market Service (:8002)                      │
│                  AdminModerationService                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Fan out to Identity, Map /internal/moderation          │ │
│  │ 2. Query local pending listings/investments               │ │
│  │ 3. Merge all items into common shape                      │ │
│  │ 4. Sort by created_at desc                                │ │
│  │ 5. Apply pagination                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │                            │
          ▼                            ▼
    ┌──────────┐                ┌──────────┐
    │ Identity │                │   Map    │
    │  :8001   │                │  :8004   │
    │ /internal│                │ /internal│
    │/moderation│               │/moderation│
    │ (KYC)    │                │  (POIs)  │
    └──────────┘                └──────────┘
```

## 4. API Contracts

### 4.1 Admin Stats Endpoint

**Endpoint:** `GET /api/v1/admin/stats`
**Auth:** Bearer (admin role)
**Location:** Market Service (:8002)

**Response:**
```typescript
interface AdminStatsResponse {
  users: {
    total: number
    byRole: Record<UserRole, number>
    byStatus: {
      active: number
      suspended: number
      banned: number
    }
    newLast30Days: number
  }
  kyc: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  listings: {
    total: number
    verified: number
    unverified: number
    featured: number
  }
  investments: {
    total: number
    byStatus: {
      available: number
      under_review: number
      taken: number
    }
    totalInterests: number
  }
  reviews: {
    listings: { total: number; averageRating: number }
    guides: { total: number; averageRating: number }
  }
  bookings: {
    total: number
    pending: number
    confirmed: number
    inProgress: number
    completed: number
    cancelled: number
  }
  guides: {
    total: number
    verified: number
    active: number
  }
  packages: {
    total: number
    active: number
  }
  pois: {
    total: number
    approved: number
    pending: number
    rejected: number
  }
  carpoolRides: {
    total: number
    open: number
    full: number
    departed: number
    completed: number
    cancelled: number
  }
  meta: {
    sources: string[]      // ["identity", "market", "guide-booking", "map"]
    degraded: boolean      // true if any service failed
    cachedAt: string | null
  }
}
```

### 4.2 Moderation Queue Endpoint

**Endpoint:** `GET /api/v1/admin/moderation/queue`
**Auth:** Bearer (admin role)
**Location:** Market Service (:8002)

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | all | Comma-separated: `listing,investment,kyc,poi` |
| `limit` | number | 20 | Max 100 |
| `offset` | number | 0 | Pagination offset |

**Response:**
```typescript
interface ModerationQueueResponse {
  data: ModerationItem[]
  total: number
  hasMore: boolean
}

interface ModerationItem {
  id: string
  type: 'listing' | 'investment' | 'kyc' | 'poi'
  title: string
  description: string | null
  status: string
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  service: 'identity' | 'market' | 'map'
  actions: {
    approve: string   // e.g., "PATCH /admin/listings/:id/verify"
    reject: string
    view: string      // e.g., "GET /listings/:id"
  }
}
```

### 4.3 Internal Stats Endpoints

#### Identity Service `/internal/stats`

**Endpoint:** `GET /api/v1/internal/stats`
**Auth:** InternalGuard (x-internal-secret header)

```typescript
interface IdentityStats {
  users: {
    total: number
    byRole: Record<UserRole, number>
    byStatus: {
      active: number
      suspended: number
      banned: number
    }
    newLast30Days: number
  }
  kyc: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}
```

#### Market Service `/internal/stats`

**Endpoint:** `GET /api/v1/internal/stats`
**Auth:** InternalGuard (x-internal-secret header)

```typescript
interface MarketStats {
  listings: {
    total: number
    verified: number
    unverified: number
    featured: number
  }
  investments: {
    total: number
    byStatus: {
      available: number
      under_review: number
      taken: number
    }
    totalInterests: number
  }
  reviews: {
    total: number
    averageRating: number
  }
}
```

### 4.4 Internal Moderation Endpoints

#### Identity Service `/internal/moderation`

**Endpoint:** `GET /api/v1/internal/moderation`
**Auth:** InternalGuard

```typescript
interface IdentityModerationResponse {
  data: Array<{
    id: string
    type: 'kyc'
    userId: string
    userName: string
    userEmail: string
    documentType: string
    status: 'pending'
    createdAt: string
  }>
}
```

#### Map Service `/internal/moderation`

**Endpoint:** `GET /api/v1/internal/moderation`
**Auth:** InternalGuard

```typescript
interface MapModerationResponse {
  data: Array<{
    id: string
    type: 'poi'
    name: string
    description: string | null
    suggestedBy: string
    suggestedByName: string
    status: 'pending'
    createdAt: string
  }>
}
```

## 5. KYC Workflow Events

### 5.1 Event Definitions

Add to Redis Streams when KYC status changes:

**Stream:** `kyc:events`

```typescript
// kyc.approved
{
  type: 'kyc.approved'
  payload: {
    kycId: string
    userId: string
    documentType: string
    reviewedBy: string
    reviewedAt: string
  }
}

// kyc.rejected
{
  type: 'kyc.rejected'
  payload: {
    kycId: string
    userId: string
    documentType: string
    reviewedBy: string
    reviewedAt: string
    reason: string
  }
}
```

### 5.2 Notification Trigger

On KYC approval/rejection, emit notification:

```typescript
// Consumer in Identity Service
await notificationsService.create({
  userId: event.payload.userId,
  type: event.type === 'kyc.approved' ? 'kyc_approved' : 'kyc_rejected',
  title: event.type === 'kyc.approved'
    ? 'KYC Approved'
    : 'KYC Rejected',
  body: event.type === 'kyc.approved'
    ? 'Your identity verification has been approved.'
    : `Your identity verification was rejected: ${event.payload.reason}`,
})
```

## 6. Implementation Details

### 6.1 New Files

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

### 6.2 Service Configuration

```typescript
// services/market/src/admin/services.config.ts
export const ADMIN_SERVICES = [
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
    moderationPath: null,  // No moderation items from guide-booking
  },
  {
    name: 'map',
    url: process.env.MAP_SERVICE_URL ?? 'http://localhost:8004',
    statsPath: '/api/v1/internal/stats',
    moderationPath: '/api/v1/internal/moderation',
  },
] as const
```

### 6.3 Caching Strategy

| Cache Key | TTL | Invalidation |
|-----------|-----|--------------|
| `mkt:admin:stats` | 60s | Time-based only |
| `mkt:admin:moderation:{type}:{offset}:{limit}` | 30s | On any approve/reject action |

### 6.4 Error Handling

- **Service timeout:** 3000ms per service, continue with partial results
- **Service down:** Mark `degraded: true` in response, log warning
- **All services down:** Return cached data if available, else 503

### 6.5 HttpModule Setup

Add to Market service:

```typescript
// services/market/src/admin/admin.module.ts
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
      maxRedirects: 0,
    }),
    // ...
  ],
})
export class AdminModule {}
```

## 7. Testing

### 7.1 Unit Tests

- `AdminStatsService.aggregate()` — merges responses correctly
- `AdminStatsService.aggregate()` — handles partial failures
- `AdminModerationService.getQueue()` — sorts by date, paginates
- `AdminModerationService.getQueue()` — filters by type

### 7.2 E2E Tests

```typescript
describe('Admin Stats (e2e)', () => {
  it('GET /admin/stats returns aggregated data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body).toHaveProperty('users.total')
    expect(res.body).toHaveProperty('listings.total')
    expect(res.body).toHaveProperty('bookings.total')
    expect(res.body.meta.sources).toContain('identity')
  })

  it('GET /admin/stats requires admin role', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403)
  })
})

describe('Moderation Queue (e2e)', () => {
  it('GET /admin/moderation/queue returns pending items', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body.data).toBeInstanceOf(Array)
    expect(res.body).toHaveProperty('total')
  })

  it('filters by type', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/moderation/queue?type=kyc')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    res.body.data.forEach((item: any) => {
      expect(item.type).toBe('kyc')
    })
  })
})
```

## 8. Rollout Checklist

- [ ] Add `/internal/stats` to Identity service
- [ ] Add `/internal/stats` to Market service
- [ ] Add `/internal/moderation` to Identity service (KYC)
- [ ] Add `/internal/moderation` to Map service (POIs)
- [ ] Add `AdminModule` to Market service with HttpModule
- [ ] Implement `AdminStatsService` with fan-out logic
- [ ] Implement `AdminModerationService` with queue aggregation
- [ ] Add KYC event emission to existing KYC admin controller
- [ ] Add KYC notification consumer
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Update environment variables in docker-compose

## 9. Dependencies

**Existing infrastructure used:**
- `InternalGuard` from `@hena-wadeena/nest-common`
- `INTERNAL_SECRET` environment variable
- Redis client for caching
- `HttpModule` from `@nestjs/axios`

**No new external dependencies required.**
