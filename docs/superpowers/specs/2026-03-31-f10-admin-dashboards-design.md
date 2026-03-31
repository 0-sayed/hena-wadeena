# F10 Admin Dashboards — Design Spec

> **Status:** Ready for implementation  
> **Author:** Idris  
> **Date:** 2026-03-31  
> **Task:** F10 from BOARD.md  
> **Dependencies:** T29 (Admin Cross-Service Endpoints), F02 (Auth Flow)

---

## Overview

Unified admin dashboard for Hena Wadeena platform. Consolidates user management, content moderation, guide oversight, and POI approval into a single role-based interface accessible to users with the `admin` role.

### Goals

1. Wire existing stub dashboards to real backend APIs
2. Consolidate 3 separate dashboards into one unified interface
3. Provide actionable queues for pending approvals
4. Display aggregated platform stats

### Non-Goals

- Analytics/reporting dashboards (deferred to Phase 3)
- Real-time updates via WebSocket (use polling/refetch)
- Audit logging UI (logs exist in backend, no UI needed for MVP)

---

## Architecture

### Approach

Route-based architecture with shared layout. Each admin domain gets its own page component with lazy loading.

### Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin` | `AdminLayout` | Wrapper, redirects to `/admin/overview` |
| `/admin/overview` | `AdminOverview` | Stats dashboard |
| `/admin/users` | `AdminUsers` | User management |
| `/admin/moderation` | `AdminModeration` | Content approval queues |
| `/admin/guides` | `AdminGuides` | Guide + booking management |
| `/admin/map` | `AdminMap` | POI approval |

### File Structure

```
apps/web/src/
├── pages/admin/
│   ├── AdminLayout.tsx          # Shared layout with sidebar
│   ├── AdminOverview.tsx        # Stats dashboard
│   ├── AdminUsers.tsx           # User management
│   ├── AdminModeration.tsx      # Content moderation
│   ├── AdminGuides.tsx          # Guides + bookings
│   └── AdminMap.tsx             # POI management
├── hooks/
│   └── use-admin.ts             # Admin queries and mutations
├── services/
│   └── api.ts                   # Add adminAPI section
└── lib/
    └── query-keys.ts            # Add admin query keys
```

### Files to Delete

- `apps/web/src/pages/admin/AdminDashboard.tsx`
- `apps/web/src/pages/admin/ModeratorDashboard.tsx`
- `apps/web/src/pages/admin/ReviewerDashboard.tsx`

---

## Data Layer

### API Functions

Add `adminAPI` object to `apps/web/src/services/api.ts`:

```typescript
// ── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  users: { total: number; byRole: Record<string, number>; byStatus: Record<string, number>; newLast30Days: number };
  kyc: { total: number; pending: number; underReview: number; approved: number; rejected: number };
  listings: { total: number; verified: number; unverified: number; featured: number; byStatus: Record<string, number> };
  investments: { total: number; verified: number; byStatus: Record<string, number>; totalApplications: number };
  reviews: { listings: { total: number; averageRating: number }; guides: { total: number; averageRating: number } };
  bookings: { total: number; pending: number; confirmed: number; inProgress: number; completed: number; cancelled: number };
  guides: { total: number; verified: number; active: number };
  packages: { total: number; active: number };
  pois: { total: number; approved: number; pending: number; rejected: number };
  carpoolRides: { total: number; open: number; full: number; departed: number; completed: number; cancelled: number };
  meta: { sources: string[]; degraded: boolean; cachedAt: string };
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: 'active' | 'suspended' | 'banned';
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface KycSubmission {
  id: string;
  userId: string;
  fullName: string;
  documentType: string;
  documentUrl: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notes: string | null;
}

export interface AdminUserFilters {
  role?: UserRole;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminKycFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminGuideFilters {
  status?: string;
  verified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminBookingFilters {
  status?: string;
  guideId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const adminAPI = {
  // Stats
  getStats: () => apiFetchWithRefresh<AdminStatsResponse>('/admin/stats'),

  // Users
  getUsers: (params?: AdminUserFilters) =>
    apiFetchWithRefresh<PaginatedResponse<AdminUser>>(`/admin/users${toQueryString(params)}`),
  getUser: (id: string) => apiFetchWithRefresh<AdminUser>(`/admin/users/${id}`),
  changeUserRole: (id: string, role: UserRole) =>
    apiFetchWithRefresh<AdminUser>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  changeUserStatus: (id: string, status: string, reason?: string) =>
    apiFetchWithRefresh<AdminUser>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
  deleteUser: (id: string) =>
    apiFetchWithRefresh<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  // KYC
  getKycSubmissions: (params?: AdminKycFilters) =>
    apiFetchWithRefresh<PaginatedResponse<KycSubmission>>(`/admin/kyc${toQueryString(params)}`),
  reviewKyc: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    apiFetchWithRefresh<KycSubmission>(`/admin/kyc/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  // Listings moderation
  getPendingListings: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Listing>>(`/admin/moderation/queue${toQueryString(params)}`),
  verifyListing: (id: string, approved: boolean, notes?: string) =>
    apiFetchWithRefresh<Listing>(`/admin/listings/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ approved, notes }),
    }),

  // Businesses moderation
  getPendingBusinesses: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Business>>(`/businesses/pending${toQueryString(params)}`),
  verifyBusiness: (id: string, approved: boolean, rejectionReason?: string) =>
    apiFetchWithRefresh<Business>(`/businesses/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ approved, rejectionReason }),
    }),

  // Guides
  getGuides: (params?: AdminGuideFilters) =>
    apiFetchWithRefresh<PaginatedResponse<GuideDetail>>(`/admin/guides${toQueryString(params)}`),
  setGuideStatus: (id: string, active: boolean) =>
    apiFetchWithRefresh<GuideDetail>(`/admin/guides/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  verifyGuideLicense: (id: string, verified: boolean) =>
    apiFetchWithRefresh<GuideDetail>(`/admin/guides/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    }),

  // Bookings (admin view)
  getBookings: (params?: AdminBookingFilters) =>
    apiFetchWithRefresh<PaginatedResponse<Booking>>(`/admin/bookings${toQueryString(params)}`),
  cancelBooking: (id: string, reason: string) =>
    apiFetchWithRefresh<Booking>(`/admin/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancelReason: reason }),
    }),

  // POIs
  getPendingPois: (params?: { page?: number; limit?: number }) =>
    apiFetchWithRefresh<PaginatedResponse<Poi>>(`/map/pois${toQueryString({ ...params, status: 'pending' })}`),
  approvePoi: (id: string) =>
    apiFetchWithRefresh<Poi>(`/map/pois/${id}/approve`, { method: 'PATCH' }),
  rejectPoi: (id: string, reason?: string) =>
    apiFetchWithRefresh<Poi>(`/map/pois/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};
```

### Query Keys

Add to `apps/web/src/lib/query-keys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys
  admin: {
    stats: () => ['admin', 'stats'] as const,
    users: (filters?: AdminUserFilters) => ['admin', 'users', filters] as const,
    user: (id: string) => ['admin', 'users', id] as const,
    kyc: (filters?: AdminKycFilters) => ['admin', 'kyc', filters] as const,
    pendingListings: (filters?: object) => ['admin', 'moderation', 'listings', filters] as const,
    pendingBusinesses: (filters?: object) => ['admin', 'moderation', 'businesses', filters] as const,
    guides: (filters?: AdminGuideFilters) => ['admin', 'guides', filters] as const,
    bookings: (filters?: AdminBookingFilters) => ['admin', 'bookings', filters] as const,
    pendingPois: (filters?: object) => ['admin', 'pois', filters] as const,
  },
};
```

### Hooks

Create `apps/web/src/hooks/use-admin.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

// ── Queries ─────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: adminAPI.getStats,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAdminUsers(filters?: AdminUserFilters) {
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => adminAPI.getUsers(filters),
  });
}

export function useAdminKyc(filters?: AdminKycFilters) {
  return useQuery({
    queryKey: queryKeys.admin.kyc(filters),
    queryFn: () => adminAPI.getKycSubmissions(filters),
  });
}

export function useAdminPendingListings(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingListings(filters),
    queryFn: () => adminAPI.getPendingListings(filters),
  });
}

export function useAdminPendingBusinesses(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingBusinesses(filters),
    queryFn: () => adminAPI.getPendingBusinesses(filters),
  });
}

export function useAdminGuides(filters?: AdminGuideFilters) {
  return useQuery({
    queryKey: queryKeys.admin.guides(filters),
    queryFn: () => adminAPI.getGuides(filters),
  });
}

export function useAdminBookings(filters?: AdminBookingFilters) {
  return useQuery({
    queryKey: queryKeys.admin.bookings(filters),
    queryFn: () => adminAPI.getBookings(filters),
  });
}

export function useAdminPendingPois(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingPois(filters),
    queryFn: () => adminAPI.getPendingPois(filters),
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      adminAPI.changeUserRole(id, role),
    onSuccess: () => {
      toast.success('تم تغيير الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('فشل تغيير الدور'),
  });
}

export function useChangeUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      adminAPI.changeUserStatus(id, status, reason),
    onSuccess: () => {
      toast.success('تم تحديث حالة المستخدم');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });
}

export function useReviewKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) =>
      adminAPI.reviewKyc(id, status, notes),
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'تم قبول المستند' : 'تم رفض المستند');
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل مراجعة المستند'),
  });
}

export function useVerifyListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, notes }: { id: string; approved: boolean; notes?: string }) =>
      adminAPI.verifyListing(id, approved, notes),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'تم قبول الإعلان' : 'تم رفض الإعلان');
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل مراجعة الإعلان'),
  });
}

export function useVerifyBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) =>
      adminAPI.verifyBusiness(id, approved, reason),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'تم قبول النشاط التجاري' : 'تم رفض النشاط التجاري');
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل مراجعة النشاط التجاري'),
  });
}

export function useSetGuideStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminAPI.setGuideStatus(id, active),
    onSuccess: () => {
      toast.success('تم تحديث حالة المرشد');
      queryClient.invalidateQueries({ queryKey: ['admin', 'guides'] });
    },
    onError: () => toast.error('فشل تحديث حالة المرشد'),
  });
}

export function useVerifyGuideLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      adminAPI.verifyGuideLicense(id, verified),
    onSuccess: () => {
      toast.success('تم تحديث حالة الترخيص');
      queryClient.invalidateQueries({ queryKey: ['admin', 'guides'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل تحديث حالة الترخيص'),
  });
}

export function useAdminCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminAPI.cancelBooking(id, reason),
    onSuccess: () => {
      toast.success('تم إلغاء الحجز');
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل إلغاء الحجز'),
  });
}

export function useApprovePoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAPI.approvePoi(id),
    onSuccess: () => {
      toast.success('تم قبول نقطة الاهتمام');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل قبول نقطة الاهتمام'),
  });
}

export function useRejectPoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminAPI.rejectPoi(id, reason),
    onSuccess: () => {
      toast.success('تم رفض نقطة الاهتمام');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل رفض نقطة الاهتمام'),
  });
}
```

---

## Component Design

### AdminLayout

Shared wrapper with:
- Sidebar navigation (collapsible on mobile)
- Header with admin title and user avatar
- `<Outlet />` for nested route content
- Permission check — redirects non-admin users

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  Admin Dashboard                    [Avatar ▼]  │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  نظرة    │     [Page Content via Outlet]               │
│  عامة    │                                              │
│          │                                              │
│  ────    │                                              │
│          │                                              │
│  المستخد │                                              │
│  مين     │                                              │
│          │                                              │
│  المراجع │                                              │
│  ة       │                                              │
│          │                                              │
│  المرشد  │                                              │
│  ين      │                                              │
│          │                                              │
│  الخريطة │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Shared Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `StatCard` | `icon`, `label`, `value`, `trend?` | Display single stat |
| `DataTable` | `columns`, `data`, `loading`, `pagination`, `onRowAction` | Generic data table |
| `StatusBadge` | `status`, `variant?` | Colored status indicator |
| `FilterBar` | `filters`, `onChange`, `searchPlaceholder` | Search + filter controls |
| `ConfirmDialog` | `title`, `description`, `onConfirm`, `variant` | Action confirmation |
| `EmptyState` | `icon`, `title`, `description` | No data placeholder |

---

## Features by Page

### AdminOverview (`/admin/overview`)

**Data:** `useAdminStats()`

**Layout:**
- 4-column stat cards grid (responsive: 2 cols on tablet, 1 on mobile)
- Quick action buttons for queues with pending counts
- Last updated timestamp

**Stats displayed:**
- Total users / New this month
- Pending KYC submissions
- Unverified listings
- Pending POIs
- Active guides
- Today's bookings

### AdminUsers (`/admin/users`)

**Data:** `useAdminUsers(filters)`

**Features:**
- Paginated table with columns: Name, Email, Role, Status, Created, Actions
- Filters: Role dropdown, Status dropdown, Search input
- Actions per row:
  - Change role (dropdown)
  - Change status (active/suspended/banned)
  - View details (modal or expandable row)

**Mutations:** `useChangeUserRole()`, `useChangeUserStatus()`

### AdminModeration (`/admin/moderation`)

**Data:** `useAdminKyc()`, `useAdminPendingListings()`, `useAdminPendingBusinesses()`

**Layout:** Tabbed interface
- **KYC tab:** Document submissions queue
- **Listings tab:** Unverified listings queue  
- **Businesses tab:** Pending business directory entries

**Actions:**
- Approve / Reject with optional notes
- Preview content before decision (expandable row — click to expand details inline)

**Mutations:** `useReviewKyc()`, `useVerifyListing()`, `useVerifyBusiness()`

### AdminGuides (`/admin/guides`)

**Data:** `useAdminGuides()`, `useAdminBookings()`

**Layout:** Two sections
1. **Guides list:** Name, rating, license status, packages count, active status
2. **Bookings list:** All platform bookings with filters

**Actions:**
- Verify/unverify license
- Toggle active status
- Cancel booking (with reason)

**Mutations:** `useVerifyGuideLicense()`, `useSetGuideStatus()`, `useAdminCancelBooking()`

### AdminMap (`/admin/map`)

**Data:** `useAdminPendingPois()`

**Features:**
- Queue of user-submitted POIs pending approval
- Preview: Name, category, coordinates, submitted by
- Actions: Approve / Reject with reason

**Mutations:** `useApprovePoi()`, `useRejectPoi()`

---

## Routing Configuration

Update `apps/web/src/App.tsx` (or router config):

```typescript
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminModeration = lazy(() => import('@/pages/admin/AdminModeration'));
const AdminGuides = lazy(() => import('@/pages/admin/AdminGuides'));
const AdminMap = lazy(() => import('@/pages/admin/AdminMap'));

// In routes array:
{
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Navigate to="overview" replace /> },
    { path: 'overview', element: <AdminOverview /> },
    { path: 'users', element: <AdminUsers /> },
    { path: 'moderation', element: <AdminModeration /> },
    { path: 'guides', element: <AdminGuides /> },
    { path: 'map', element: <AdminMap /> },
  ],
}
```

---

## Error Handling

- **Network errors:** Toast notification + retry button in UI
- **403 Forbidden:** Redirect to home with "Access denied" toast
- **404 Not Found:** Show inline error state, don't break page
- **Mutation failures:** Toast error, no UI state change (safe by default)

---

## Testing Strategy

### Unit Tests
- Hook tests: Mock API responses, verify query keys and mutation callbacks
- Component tests: Render with mock data, verify actions trigger mutations

### E2E Tests (if time permits)
- Admin can view stats dashboard
- Admin can change user role
- Admin can approve/reject KYC document
- Admin can verify listing

---

## Implementation Order

1. **Data layer:** Add `adminAPI` to `api.ts`, query keys, create `use-admin.ts`
2. **Layout:** Create `AdminLayout` with sidebar navigation
3. **Overview:** Stats dashboard with real data
4. **Users:** User management page
5. **Moderation:** KYC + Listings + Businesses tabs
6. **Guides:** Guide management + bookings
7. **Map:** POI approval queue
8. **Cleanup:** Delete old stub dashboards, update routing

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Separate roles for moderator/reviewer? | No — single admin role with tabbed UI |
| Real-time updates? | No — use staleTime + refetchOnWindowFocus |
| Activity audit log UI? | Deferred — backend logs exist, no UI for MVP |
