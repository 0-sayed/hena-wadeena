# F07: Notifications Frontend Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing React notification UI to the real Identity service backend API — fix type mismatches, response parsing, field casing, and polish the UX.

**Architecture:** Frontend-only changes. The backend notification system (Identity service) is already complete with CRUD endpoints, Redis-cached unread counts, and event consumers. The frontend has a `NotificationsPage` and a header badge, but they use wrong field names, wrong response envelopes, and manual state management instead of React Query. We fix all of that.

**Tech Stack:** React 18, TanStack Query v5, TypeScript, `@hena-wadeena/types` shared package, Lucide icons, Tailwind CSS, shadcn/ui components.

**Spec:** `docs/superpowers/specs/2026-03-24-f07-notifications-frontend-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/lib/query-keys.ts` | Modify | Add `list()` factory key for parameterized notification queries |
| `apps/web/src/services/api.ts` | Modify | Delete local `Notification` type, import from shared package, fix `notificationsAPI` functions |
| `apps/web/src/hooks/use-notifications.ts` | Modify | Fix response shape access (`data?.count` instead of `data?.data?.count`) |
| `apps/web/src/components/layout/Header.tsx` | Modify | Replace manual `useState`/`useEffect`/`setInterval` with `useUnreadNotificationCount()` hook |
| `apps/web/src/pages/profile/NotificationsPage.tsx` | Rewrite | React Query, camelCase fields, correct icon mapping, pagination, mutations |

---

## Task 1: Verify Shared Types Exports

**Files:**
- Possibly modify: `packages/types/src/index.ts`

**Context:** Tasks 2-4 import `NotificationType`, `Notification`, and `NotificationListResponse` from `@hena-wadeena/types`. Verify these are exported from the package barrel before touching any consumer code.

- [ ] **Step 1: Check barrel exports**

Run: `grep -n "NotificationType\|NotificationListResponse\|notifications" packages/types/src/index.ts`

The exports should already exist via re-export chains:
- `packages/types/src/index.ts` → re-exports `* from './identity'` and `* from './enums'`
- `packages/types/src/identity/index.ts` → re-exports `* from './notifications'`
- `packages/types/src/enums/index.ts` → exports `NotificationType` enum

If any are missing, add them to `packages/types/src/index.ts`:

```typescript
export type { Notification, NotificationListResponse } from './identity/notifications';
// NotificationType should come through the enums re-export
```

- [ ] **Step 2: Rebuild types package**

Run: `pnpm --filter @hena-wadeena/types build`

Expected: Clean build with no errors.

- [ ] **Step 3: Commit if changed**

```bash
git add packages/types/src/index.ts
git commit -m "fix(types): export Notification and NotificationListResponse from barrel"
```

If nothing changed, skip the commit.

---

## Task 2: Update Query Keys

**Files:**
- Modify: `apps/web/src/lib/query-keys.ts` (lines 5-8)

- [ ] **Step 1: Update the notification query keys**

In `apps/web/src/lib/query-keys.ts`, replace the `notifications` block (lines 5-8):

```typescript
// BEFORE
notifications: {
  all: () => ['notifications'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
},

// AFTER
notifications: {
  all: () => ['notifications', 'list'] as const,
  list: (filters: { page: number; limit: number; unreadOnly?: boolean }) =>
    [...queryKeys.notifications.all(), filters] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
},
```

`all()` is the base prefix key — used for cache invalidation (prefix-matches all paginated list queries). `list(filters)` is the parameterized key for specific queries. `unreadCount()` lives under a separate prefix.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors in `query-keys.ts`. There may be errors in other files that consume `queryKeys.notifications.all()` — that's fine, we'll fix those in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/query-keys.ts
git commit -m "refactor(web): add parameterized notification list query key

Add notifications.list(filters) for paginated queries alongside
notifications.all() base key for prefix-based cache invalidation."
```

---

## Task 3: Fix API Client

**Files:**
- Modify: `apps/web/src/services/api.ts` (lines 793-814)

**Context:** `apiFetch<T>` returns the raw JSON body — no envelope unwrapping. The backend returns:
- `GET /notifications` → `NotificationListResponse` (`{ data, total, page, limit, hasMore, unreadCount }`)
- `GET /notifications/unread-count` → `{ count: number }`
- `PATCH /notifications/:id/read` → `{ success: boolean }`
- `PATCH /notifications/read-all` → `{ success: boolean }`

The file already imports `PaginatedResponse` from `@hena-wadeena/types` on line 9.

- [ ] **Step 1: Add shared type imports**

At the top of `apps/web/src/services/api.ts`, add to the existing `@hena-wadeena/types` imports (line 8-9):

```typescript
// BEFORE (line 8-9)
import { UserRole } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';

// AFTER
import { UserRole } from '@hena-wadeena/types';
import type { PaginatedResponse, NotificationListResponse } from '@hena-wadeena/types';
```

Check that `NotificationListResponse` is exported from the types package barrel. If not, check `packages/types/src/index.ts` and add the re-export.

- [ ] **Step 2: Replace the notification section**

Delete lines 793-814 (the local `Notification` interface and old `notificationsAPI`) and replace with:

```typescript
// ── Notifications ──────────────────────────────────────────────────────────

export const notificationsAPI = {
  getAll: (page = 1, limit = 20, unreadOnly = false) =>
    apiFetchWithRefresh<NotificationListResponse>(
      `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
    ),

  getUnreadCount: () =>
    apiFetchWithRefresh<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiFetchWithRefresh<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllRead: () =>
    apiFetchWithRefresh<{ success: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};
```

Key changes from old code:
- Deleted local `Notification` interface — use `@hena-wadeena/types` instead
- `getAll` now takes pagination params, returns `NotificationListResponse` (not `{ success, data }`)
- `getUnreadCount` returns `{ count: number }` (not `{ success, data: { count } }`)
- `markRead` uses `PATCH` (was `PUT`)
- Added `markAllRead` (was missing — page used to loop `markRead`)

- [ ] **Step 3: Fix any import breakage**

The old code exported `type Notification` from `api.ts`. Files that imported it:
- `apps/web/src/pages/profile/NotificationsPage.tsx` (line 7: `import { notificationsAPI, type Notification } from '@/services/api'`)

This import will now break because we deleted the local `Notification` type. We fix this in Task 5, but for now the TS compiler will report it. That's expected.

- [ ] **Step 4: Verify changes compile (ignoring downstream breakage)**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -c "api.ts"` — should be 0 errors in api.ts itself.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api.ts
git commit -m "fix(web): align notification API client with backend contract

Delete local Notification interface in favor of @hena-wadeena/types.
Fix response types, HTTP methods (PUT→PATCH), and add markAllRead."
```

---

## Task 4: Fix the Unread Count Hook and Header Badge

**Files:**
- Modify: `apps/web/src/hooks/use-notifications.ts`
- Modify: `apps/web/src/components/layout/Header.tsx`

**Context:** The hook is almost correct — it uses the right query key and interval. But after Task 2, the response shape changed: `getUnreadCount()` now returns `{ count: number }` directly (not `{ success, data: { count } }`). Consumers must access `data?.count`.

The Header currently does NOT use the hook. It has its own manual `useState` + `useEffect` + `setInterval` that calls `notificationsAPI.getUnreadCount()` and reads `r.data.count`. This is both wrong (response shape) and duplicative (the hook exists for this purpose).

- [ ] **Step 1: Verify the hook needs no code changes**

Read `apps/web/src/hooks/use-notifications.ts`. The hook calls `notificationsAPI.getUnreadCount()` and returns the React Query result. Since `getUnreadCount` now returns `{ count: number }`, the hook's `data` will be `{ count: number }`. Consumers access `data?.count`. The hook itself doesn't destructure — it just returns the query. **No change needed to the hook file.**

- [ ] **Step 2: Replace Header's manual notification polling with the hook**

In `apps/web/src/components/layout/Header.tsx`:

1. Add import:
```typescript
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
```

2. Remove the import of `notificationsAPI` (line 17):
```typescript
// DELETE this line:
import { notificationsAPI } from '@/services/api';
```
**Note:** Keep the `useEffect` import — it's still used by the `ThemeToggle` component in the same file.

3. Inside the `Header()` function, remove:
- The `useState` for unreadCount (line 56): `const [unreadCount, setUnreadCount] = useState(0);`
- The entire `useEffect` block that fetches unread count and sets up an interval (~lines 62-75)

4. Add in its place:
```typescript
const { data: unreadData } = useUnreadNotificationCount();
const unreadCount = unreadData?.count ?? 0;
```

The rest of the Header template already references `unreadCount` everywhere — no template changes needed.

- [ ] **Step 3: Verify the header compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep "Header.tsx"` — should be 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-notifications.ts apps/web/src/components/layout/Header.tsx
git commit -m "refactor(web): use shared hook for header notification badge

Replace manual useState/useEffect/setInterval in Header with the
useUnreadNotificationCount hook. Deduplicates polling and shares
the React Query cache with NotificationsPage."
```

---

## Task 5: Rewrite NotificationsPage

**Files:**
- Rewrite: `apps/web/src/pages/profile/NotificationsPage.tsx`

**Context:** This is the biggest change. The page currently uses manual state management, wrong field names, wrong response parsing, stale icon mappings, no pagination, and loops individual `markRead` calls for "mark all". We rewrite it to use React Query, correct types, and the proper API contract.

**Reference files for existing patterns:**
- `apps/web/src/components/motion/ScrollReveal.tsx` — `SR` component
- `apps/web/src/components/motion/PageTransition.tsx` — `PageTransition`, `GradientMesh`
- `apps/web/src/components/motion/Skeleton.tsx` — loading skeleton
- `apps/web/src/components/ui/card.tsx`, `button.tsx`, `badge.tsx` — shadcn components

- [ ] **Step 1: Write the new NotificationsPage**

Replace the entire contents of `apps/web/src/pages/profile/NotificationsPage.tsx` with:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  ShieldCheck,
  ShieldX,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationsAPI } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { NotificationType } from '@hena-wadeena/types';
import type { Notification } from '@hena-wadeena/types';

const PAGE_SIZE = 20;

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  [NotificationType.BOOKING_REQUESTED]: {
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-blue-500 bg-blue-500/10',
  },
  [NotificationType.BOOKING_CONFIRMED]: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'text-green-500 bg-green-500/10',
  },
  [NotificationType.BOOKING_CANCELLED]: {
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-red-500 bg-red-500/10',
  },
  [NotificationType.BOOKING_COMPLETED]: {
    icon: <Trophy className="h-5 w-5" />,
    color: 'text-green-600 bg-green-600/10',
  },
  [NotificationType.REVIEW_SUBMITTED]: {
    icon: <Star className="h-5 w-5" />,
    color: 'text-yellow-500 bg-yellow-500/10',
  },
  [NotificationType.KYC_APPROVED]: {
    icon: <ShieldCheck className="h-5 w-5" />,
    color: 'text-green-500 bg-green-500/10',
  },
  [NotificationType.KYC_REJECTED]: {
    icon: <ShieldX className="h-5 w-5" />,
    color: 'text-red-500 bg-red-500/10',
  },
  [NotificationType.SYSTEM]: {
    icon: <Bell className="h-5 w-5" />,
    color: 'text-muted-foreground bg-muted',
  },
};

function getTypeConfig(type: string) {
  return typeConfig[type] ?? typeConfig[NotificationType.SYSTEM];
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;

  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const NotificationsPage = () => {
  const [page, setPage] = useState(1);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.notifications.list({ page, limit: PAGE_SIZE }),
    queryFn: () => notificationsAPI.getAll(page, PAGE_SIZE),
    enabled: isAuthenticated,
  });

  // unreadCount comes from the list response envelope — no separate polling query needed.
  // The header's useUnreadNotificationCount hook handles 60s background polling independently.
  // Mutations invalidate both the list and unreadCount caches, keeping both in sync.
  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: invalidateAll,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: invalidateAll,
  });

  const handleMarkRead = (n: Notification) => {
    if (!n.readAt) markReadMutation.mutate(n.id);
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-2xl">
            <SR>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Bell className="h-7 w-7 text-red-500" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">الإشعارات</h1>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white animate-pulse">{unreadCount}</Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:scale-[1.03] transition-transform"
                    disabled={markAllReadMutation.isPending}
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    <CheckCheck className="h-4 w-4 ml-1" />
                    قراءة الكل
                  </Button>
                )}
              </div>
            </SR>

            <div className="space-y-3">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => <Skeleton key={i} h="h-20" className="rounded-2xl" />)
              ) : error ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    حدث خطأ في تحميل الإشعارات
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 mx-auto block"
                      onClick={() =>
                        void queryClient.invalidateQueries({
                          queryKey: queryKeys.notifications.list({ page, limit: PAGE_SIZE }),
                        })
                      }
                    >
                      إعادة المحاولة
                    </Button>
                  </CardContent>
                </Card>
              ) : notifications.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    لا توجد إشعارات
                  </CardContent>
                </Card>
              ) : (
                notifications.map((n, idx) => {
                  const config = getTypeConfig(n.type);
                  return (
                    <SR key={n.id} delay={idx * 40}>
                      <Card
                        className={`hover-lift cursor-pointer rounded-2xl transition-all duration-250 ${!n.readAt ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border/50'}`}
                        onClick={() => handleMarkRead(n)}
                      >
                        <CardContent className="p-5 flex items-start gap-4">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center mt-0.5 ${config.color}`}
                          >
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={`font-bold text-sm ${!n.readAt ? 'text-foreground' : 'text-muted-foreground'}`}
                              >
                                {n.titleAr}
                              </h3>
                              {!n.readAt && (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1.5">{n.bodyAr}</p>
                            <p className="text-xs text-muted-foreground mt-2.5">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </SR>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <SR>
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </SR>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default NotificationsPage;
```

Note on pagination arrow direction: since the app is RTL (Arabic), "next page" is ChevronLeft and "previous page" is ChevronRight. This is intentional.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

Expected: Clean compilation. If `NotificationType` or `Notification` are not found, check `packages/types/src/index.ts` exports them. They should already be exported — the shared types package has these defined.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/profile/NotificationsPage.tsx
git commit -m "feat(web): rewrite NotificationsPage with React Query integration

Replace manual useState/useEffect with React Query for data fetching.
Fix camelCase field names, icon mapping, response parsing, and add
pagination controls and error state. Use shared types from
@hena-wadeena/types."
```

---

## Task 6: Full Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Build shared packages**

```bash
pnpm --filter @hena-wadeena/types build
```

Expected: Clean build.

- [ ] **Step 2: TypeScript check the frontend**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors. If there are errors, they should be pre-existing (not from our changes).

- [ ] **Step 3: Run frontend linting**

```bash
cd apps/web && npx eslint src/services/api.ts src/pages/profile/NotificationsPage.tsx src/hooks/use-notifications.ts src/lib/query-keys.ts src/components/layout/Header.tsx
```

Expected: No errors (warnings are acceptable per project convention).

- [ ] **Step 4: Verify no regressions**

Run: `pnpm --filter @hena-wadeena/web test 2>&1 | tail -20` (if tests exist)

If no tests exist for the web app, skip this step.

- [ ] **Step 5: Commit any lint fixes**

If the linter auto-fixed anything:

```bash
git add -u
git commit -m "style(web): lint fixes for notification integration"
```
