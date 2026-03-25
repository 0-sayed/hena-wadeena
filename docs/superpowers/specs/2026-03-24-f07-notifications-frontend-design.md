# F07: Notifications Frontend Integration — Design Spec

> Wire the existing React notification UI to the real Identity service API. Fix type mismatches, response parsing, and field casing. Polish UX. Zero backend changes.

## Scope

- **In scope:** Frontend-only changes to align `NotificationsPage`, API client, hooks, and header badge with the existing backend API contract.
- **Out of scope:** Wallet (deferred), notification preferences UI, real-time WebSocket, email/push dispatch, backend changes.

## Current State

### Backend (Identity service — already complete)

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/v1/notifications?page=&limit=&unreadOnly=` | GET | `{ data: Notification[], total, page, limit, hasMore, unreadCount }` |
| `/api/v1/notifications/unread-count` | GET | `{ count: number }` |
| `/api/v1/notifications/:id/read` | PATCH | `{ success: true }` |
| `/api/v1/notifications/read-all` | PATCH | `{ success: true }` |

Backend returns **camelCase** field names: `titleAr`, `bodyAr`, `readAt`, `createdAt`, `titleEn`, `bodyEn`.

### Frontend (current — broken)

The frontend defines its own `Notification` interface in `api.ts` with:
- **Snake_case fields:** `title_ar`, `body_ar`, `read_at`, `created_at` — all wrong
- **Phantom field:** `channel: string[]` — doesn't exist in backend
- **Missing fields:** `titleEn`, `bodyEn` — backend provides both languages
- **Wrong response parsing:** Assumes `{ success, data }` envelope — backend uses flat paginated response
- **Manual state management:** `useState` + `useEffect` fetch instead of React Query
- **Wrong HTTP method:** `markRead` uses `PUT` — backend expects `PATCH`
- **Missing `markAllRead`:** No API function — page loops over individual `markRead` calls instead
- **Stale icon mappings:** Includes `payment_received` and `carpool_match` which aren't in the `NotificationType` enum

## Design

### 1. API Client Layer (`apps/web/src/services/api.ts`)

**Delete** the local `Notification` interface (lines ~795-804).

**Import** from shared types:
```typescript
import type { Notification, NotificationListResponse } from '@hena-wadeena/types';
```

**Update API functions:**

```typescript
export const notificationsAPI = {
  getAll: (page = 1, limit = 20, unreadOnly = false) =>
    apiFetchWithRefresh<NotificationListResponse>(
      `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`
    ),

  getUnreadCount: () =>
    apiFetchWithRefresh<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiFetchWithRefresh<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  // NEW function — currently missing from frontend; page loops markRead individually
  markAllRead: () =>
    apiFetchWithRefresh<{ success: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};
```

**Key changes:**
- Remove `{ success, data }` unwrapping — backend returns the shape directly
- Add pagination parameters to `getAll`
- Fix `markRead` HTTP method from `PUT` to `PATCH`
- Add new `markAllRead` function (currently missing — page loops `markRead` individually)
- Type returns correctly per backend contract (`markRead`/`markAllRead` return `{ success: boolean }`, not the notification object)

### 2. NotificationsPage Component (`apps/web/src/pages/profile/NotificationsPage.tsx`)

**Replace manual state with React Query:**

Requires `useAuth()` from `@/hooks/use-auth` for `isAuthenticated` check.

```typescript
const { isAuthenticated } = useAuth();

// List query — uses parameterized key so different pages are cached separately
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.notifications.list({ page, limit }),
  queryFn: () => notificationsAPI.getAll(page, limit),
  enabled: isAuthenticated,
});

// Unread count (shared with header badge) — keep existing 60s interval
const { data: unreadData } = useQuery({
  queryKey: queryKeys.notifications.unreadCount(),
  queryFn: () => notificationsAPI.getUnreadCount(),
  enabled: isAuthenticated,
  refetchInterval: 60_000,
});

// Access count: unreadData?.count
```

**Mutations with cache invalidation:**

```typescript
const markReadMutation = useMutation({
  mutationFn: (id: string) => notificationsAPI.markRead(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
  },
});

const markAllReadMutation = useMutation({
  mutationFn: () => notificationsAPI.markAllRead(),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
  },
});
```

**Fix field access (all occurrences):**

| Before (broken) | After (correct) |
|-----------------|-----------------|
| `n.title_ar` | `n.titleAr` |
| `n.body_ar` | `n.bodyAr` |
| `n.read_at` | `n.readAt` |
| `n.created_at` | `n.createdAt` |
| `n.channel` | *(remove — doesn't exist)* |

**Add pagination controls** — simple prev/next using `page` state + `hasMore` from response.

### 3. Header Notification Badge

**Verify** `useUnreadNotificationCount` hook correctly parses `{ count: number }` response.

**Ensure** the hook uses `queryKeys.notifications.unreadCount()` so mutations on the notifications page automatically invalidate the header badge.

**Keep** existing 60-second polling interval (matches current `use-notifications.ts` and backend cache TTL).

### 4. Query Keys (`apps/web/src/lib/query-keys.ts`)

Ensure these entries exist:

```typescript
notifications: {
  // Base key for prefix-based invalidation (invalidates all list queries regardless of filters)
  all: () => ['notifications', 'list'] as const,
  // Parameterized key for specific paginated queries
  list: (filters: { page: number; limit: number; unreadOnly?: boolean }) =>
    [...queryKeys.notifications.all(), filters] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
},
```

**Invalidation strategy:** Mutations call `invalidateQueries({ queryKey: queryKeys.notifications.all() })` which uses React Query's prefix matching to invalidate ALL list queries (any page/filter combination). The `unreadCount` key lives under a separate prefix and must be invalidated explicitly.

### 5. Type Alignment

The shared `@hena-wadeena/types` package provides:

```typescript
// packages/types/src/identity/notifications.ts
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationListResponse extends PaginatedResponse<Notification> {
  unreadCount: number;
}
```

Frontend must import these. No local redefinition.

### 6. Notification Type → Icon/Color Mapping

Replace existing emoji/icon mapping. Use `NotificationType` enum as keys (e.g., `[NotificationType.BOOKING_CONFIRMED]`), which resolves to the snake_case string values (`booking_confirmed`). Remove stale entries (`payment_received`, `carpool_match`) that aren't in the enum.

| Enum member | String value | Icon | Color |
|-------------|-------------|------|-------|
| `NotificationType.BOOKING_REQUESTED` | `booking_requested` | Calendar | blue |
| `NotificationType.BOOKING_CONFIRMED` | `booking_confirmed` | CheckCircle | green |
| `NotificationType.BOOKING_CANCELLED` | `booking_cancelled` | XCircle | red |
| `NotificationType.BOOKING_COMPLETED` | `booking_completed` | Trophy | green |
| `NotificationType.REVIEW_SUBMITTED` | `review_submitted` | Star | yellow |
| `NotificationType.KYC_APPROVED` | `kyc_approved` | ShieldCheck | green |
| `NotificationType.KYC_REJECTED` | `kyc_rejected` | ShieldX | red |
| `NotificationType.SYSTEM` | `system` | Bell | gray |

**Remove** stale mappings: `payment_received`, `carpool_match`, `new_review` — these don't exist in the backend enum.

### 7. UX Polish

- **Empty state:** Arabic message "لا توجد إشعارات" with illustration
- **Error state:** Retry button on fetch failure
- **Loading:** Keep existing skeleton loaders
- **Unread visual:** Left border accent or background tint for unread items
- **Time formatting:** Relative time in Arabic ("منذ 5 دقائق") using existing date utility or `Intl.RelativeTimeFormat`

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/services/api.ts` | Delete local Notification type, import from `@hena-wadeena/types`, fix response parsing |
| `apps/web/src/pages/profile/NotificationsPage.tsx` | React Query, camelCase fields, pagination, mutations |
| `apps/web/src/hooks/use-notifications.ts` | Verify response parsing, ensure shared query key |
| `apps/web/src/lib/query-keys.ts` | Ensure notification keys exist and are consistent |

## Testing

- Verify notification list renders with real backend data
- Verify unread count badge updates when marking notifications as read
- Verify mark-all-read clears all unread indicators
- Verify empty state renders when no notifications exist
- Verify pagination controls work (next/prev)
- Verify header badge and notifications page stay in sync

## Dependencies

- **T13** (Identity: Notifications + Admin) — already complete (checked)
- **F02** (Auth Flow Integration) — needed for JWT auth context to work
- **Backend running** — Identity service at :8001 with notifications module
