# PR #79 — feat(web): unified admin dashboard (F10)

> Generated: 2026-03-31 | Branch: worktree-f10-amdin-dashboards | Last updated: 2026-03-31 15:00

## Worth Fixing

- [x] useChangeUserRole missing admin stats cache invalidation — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M5363F9 -->
  > **apps/web/src/hooks/use-admin.ts:83**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-477567e56bcb4f9d8f9e7e0c23b990a3_0001", "file_path": "apps/web/src/hooks/use-admin.ts", "start_line": 79, "end_line": 83, "side": "RIGHT"} -->
  >
  > 🟡 **useChangeUserRole missing admin stats cache invalidation**
  >
  > `useChangeUserRole` only invalidates `['admin', 'users']` but does not invalidate `['admin', 'stats']`. Every other admin mutation (`useReviewKyc`, `useVerifyListing`, `useVerifyBusiness`, `useVerifyGuideLicense`, `useAdminCancelBooking`, `useApprovePoi`, `useRejectPoi`) follows the pattern of invalidating both its domain query AND `['admin', 'stats']`. The `AdminStatsResponse` at `apps/web/src/services/api.ts:906` includes `users.byRole` which changes when a user's role is updated, causing the overview page (`AdminOverview.tsx:105`) to display stale user statistics until the 30-second `staleTime` expires.
  >
  > ```suggestion
  >     onSuccess: () => {
  >       toast.success('تم تغيير الدور بنجاح');
  >       void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  >       void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  >     },
  > ```

- [x] useChangeUserStatus missing admin stats cache invalidation — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M5363HM -->
  > **apps/web/src/hooks/use-admin.ts:96**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-477567e56bcb4f9d8f9e7e0c23b990a3_0002", "file_path": "apps/web/src/hooks/use-admin.ts", "start_line": 92, "end_line": 96, "side": "RIGHT"} -->
  >
  > 🟡 **useChangeUserStatus missing admin stats cache invalidation**
  >
  > `useChangeUserStatus` only invalidates `['admin', 'users']` but does not invalidate `['admin', 'stats']`, breaking the consistent pattern used by all other admin mutations. The `AdminStatsResponse` includes `users.byStatus` which changes when a user's status is updated, causing stale statistics on the overview page until the 30-second `staleTime` expires.
  >
  > ```suggestion
  >     onSuccess: () => {
  >       toast.success('تم تحديث حالة المستخدم');
  >       void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  >       void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  >     },
  > ```

- [x] useSetGuideStatus missing admin stats cache invalidation — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M5363Il -->
  > **apps/web/src/hooks/use-admin.ts:158**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-477567e56bcb4f9d8f9e7e0c23b990a3_0003", "file_path": "apps/web/src/hooks/use-admin.ts", "start_line": 154, "end_line": 158, "side": "RIGHT"} -->
  >
  > 🟡 **useSetGuideStatus missing admin stats cache invalidation**
  >
  > `useSetGuideStatus` only invalidates `['admin', 'guides']` but does not invalidate `['admin', 'stats']`, unlike the adjacent `useVerifyGuideLicense` mutation which does both (`apps/web/src/hooks/use-admin.ts:169-170`). The overview page directly displays `stats.guides.active` (`AdminOverview.tsx:148`), so when a guide is activated/deactivated, the "Active Guides" card shows a stale count until the 30-second `staleTime` expires.
  >
  > ```suggestion
  >     onSuccess: () => {
  >       toast.success('تم تحديث حالة المرشد');
  >       void queryClient.invalidateQueries({ queryKey: ['admin', 'guides'] });
  >       void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  >     },
  > ```

## Not Worth Fixing

_None found._
