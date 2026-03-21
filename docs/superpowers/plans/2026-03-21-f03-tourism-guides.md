# F03 — Tourism + Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the tourism and guide frontend pages to real guide-booking backend endpoints using React Query hooks, replacing mock data with live API calls.

**Architecture:** Incremental rewire — fix API types first, add React Query hooks, then update each page one by one. No backend changes. All data fetching moves from raw `useState`+`useEffect` to React Query `useQuery` hooks with `placeholderData: keepPreviousData` for smooth pagination.

**Tech Stack:** React 19, React Router v7, TanStack React Query v5, Shadcn/ui + Radix UI, Tailwind CSS, TypeScript strict mode.

**Spec:** `docs/superpowers/specs/2026-03-21-f03-tourism-guides-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/lib/format.ts` | **Create** | Price formatting (piasters→EGP), enum→Arabic label maps |
| `apps/web/src/lib/query-string.ts` | **Create** | `toQueryString()` utility for building URL params |
| `apps/web/src/services/api.ts` | **Modify** (lines 107-433) | Replace mock tourism/guide types & API functions with real backend types |
| `apps/web/src/lib/query-keys.ts` | **Modify** | Add `packages` key namespace, rename `attraction` param to `slug` |
| `apps/web/src/hooks/use-attractions.ts` | **Create** | `useAttractions`, `useAttraction`, `useNearbyAttractions` hooks |
| `apps/web/src/hooks/use-guides.ts` | **Create** | `useGuides`, `useGuide`, `useGuidePackages` hooks |
| `apps/web/src/hooks/use-packages.ts` | **Create** | `usePackages` hook |
| `apps/web/src/App.tsx` | **Modify** (lines 62-66, 139-147) | Update routes: slug for attractions, add packages, remove dead routes |
| `apps/web/src/components/home/FeaturedSection.tsx` | **Rewrite** | Rewire to `useAttractions({ featured: true })`, fix field names |
| `apps/web/src/pages/TourismPage.tsx` | **Rewrite** | 2 tabs (remove housing), use hooks, fix field names |
| `apps/web/src/pages/tourism/AttractionsPage.tsx` | **Rewrite** | Use hooks, add real filters, pagination |
| `apps/web/src/pages/tourism/AttractionDetailsPage.tsx` | **Rewrite** | Use hooks, slug-based route, nearby section |
| `apps/web/src/pages/guides/GuidesPage.tsx` | **Rewrite** | Use hooks, add real filters, pagination |
| `apps/web/src/pages/guides/GuideProfilePage.tsx` | **Rewrite** | Use hooks, packages list with real data |
| `apps/web/src/pages/tourism/PackagesPage.tsx` | **Create** | New page: browse all tour packages |

---

## Task 1: Utilities — `format.ts` and `query-string.ts`

**Files:**
- Create: `apps/web/src/lib/format.ts`
- Create: `apps/web/src/lib/query-string.ts`

- [ ] **Step 1: Create `apps/web/src/lib/query-string.ts`**

```typescript
/**
 * Builds a URL query string from a params object, omitting null/undefined values.
 */
export function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
```

- [ ] **Step 2: Create `apps/web/src/lib/format.ts`**

```typescript
// ── Price formatting ────────────────────────────────────────────────────────

export function formatEGP(piasters: number): string {
  const egp = piasters / 100;
  return egp % 1 === 0 ? `${egp} ج.م` : `${egp.toFixed(2)} ج.م`;
}

// ── Enum → Arabic label maps ────────────────────────────────────────────────

export type AttractionType = 'attraction' | 'historical' | 'natural' | 'festival' | 'adventure';
export type AttractionArea = 'kharga' | 'dakhla' | 'farafra' | 'baris' | 'balat';
export type BestSeason = 'winter' | 'summer' | 'spring' | 'all_year';
export type BestTimeOfDay = 'morning' | 'evening' | 'any';
export type Difficulty = 'easy' | 'moderate' | 'hard';

export const attractionTypeLabels: Record<AttractionType, string> = {
  attraction: 'معلم سياحي',
  historical: 'تاريخي',
  natural: 'طبيعي',
  festival: 'مهرجان',
  adventure: 'مغامرة',
};

export const areaLabels: Record<AttractionArea, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
};

export const bestSeasonLabels: Record<BestSeason, string> = {
  winter: 'الشتاء',
  summer: 'الصيف',
  spring: 'الربيع',
  all_year: 'طوال العام',
};

export const bestTimeOfDayLabels: Record<BestTimeOfDay, string> = {
  morning: 'الصباح',
  evening: 'المساء',
  any: 'أي وقت',
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: 'سهل',
  moderate: 'متوسط',
  hard: 'صعب',
};

import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';

export const languageLabels: Record<GuideLanguage, string> = {
  [GuideLanguage.ARABIC]: 'العربية',
  [GuideLanguage.ENGLISH]: 'الإنجليزية',
  [GuideLanguage.FRENCH]: 'الفرنسية',
  [GuideLanguage.GERMAN]: 'الألمانية',
  [GuideLanguage.ITALIAN]: 'الإيطالية',
};

export const specialtyLabels: Record<GuideSpecialty, string> = {
  [GuideSpecialty.HISTORY]: 'تاريخ',
  [GuideSpecialty.NATURE]: 'طبيعة',
  [GuideSpecialty.ADVENTURE]: 'مغامرة',
  [GuideSpecialty.CULTURE]: 'ثقافة',
  [GuideSpecialty.PHOTOGRAPHY]: 'تصوير',
  [GuideSpecialty.FOOD]: 'طعام',
};
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from the new files.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/format.ts apps/web/src/lib/query-string.ts
git commit -m "feat(web): add price formatting and query string utilities"
```

---

## Task 2: API Layer — Types and Functions

**Files:**
- Modify: `apps/web/src/services/api.ts` (lines 107-433)

**What changes:** Replace the Tourism section (lines 107-166), the Guides/Bookings section (lines 351-433), and the mock types `Attraction`, `Guide`, `Accommodation`, `GuideProfile`, `TourPackage`, `Booking`, `Review` with real backend types. Add `attractionsAPI`, update `guidesAPI`, add `packagesAPI`. Keep all other sections (Auth, Market, Logistics, etc.) untouched.

- [ ] **Step 1: Replace the Tourism section (lines 107-166)**

Delete the old `Attraction`, `Guide`, `Accommodation` interfaces and `tourismAPI` object. Replace with the new types and `attractionsAPI`:

```typescript
// ── Tourism — Attractions ───────────────────────────────────────────────────

import type { PaginatedResponse } from '@hena-wadeena/types';
import type { AttractionType, AttractionArea, BestSeason, BestTimeOfDay, Difficulty } from '@/lib/format';
import { toQueryString } from '@/lib/query-string';

export interface Attraction {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  type: AttractionType;
  area: AttractionArea;
  descriptionAr: string | null;
  descriptionEn: string | null;
  historyAr: string | null;
  bestSeason: BestSeason | null;
  bestTimeOfDay: BestTimeOfDay | null;
  entryFee: { adultsPiasters?: number; childrenPiasters?: number; foreignersPiasters?: number } | null;
  openingHours: string | null;
  durationHours: number | null;
  difficulty: Difficulty | null;
  tips: string[] | null;
  nearbySlugs: string[] | null;
  location: { x: number; y: number } | null;
  images: string[] | null;
  thumbnail: string | null;
  isActive: boolean;
  isFeatured: boolean;
  ratingAvg: number | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttractionFilters {
  type?: AttractionType;
  area?: AttractionArea;
  featured?: boolean;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const attractionsAPI = {
  getAll: (filters?: AttractionFilters) =>
    apiFetch<PaginatedResponse<Attraction>>(`/attractions${toQueryString(filters)}`),
  getBySlug: (slug: string) =>
    apiFetch<Attraction>(`/attractions/${slug}`),
  getNearby: (slug: string, limit?: number, radiusKm?: number) =>
    apiFetch<Attraction[]>(`/attractions/${slug}/nearby${toQueryString({ limit, radiusKm })}`),
};
```

> **Important:** The `import type { PaginatedResponse }` line goes at the top of the file alongside the existing `UserRole` import. The `toQueryString` and format type imports also go at the top. Do NOT duplicate imports.

- [ ] **Step 2: Replace the Guides/Bookings section (lines 351-433)**

Delete the old `GuideProfile` interface and old `guidesAPI` object. **Keep the `Booking`, `Review` types and move them into a separate `bookingsAPI` section** — these are used by `BookingsPage.tsx` and `GuideProfilePage.tsx` (which still reference mock booking/review endpoints until T15/T18 are implemented). Replace with:

```typescript
// ── Guides ──────────────────────────────────────────────────────────────────

export interface GuideListItem {
  id: string;
  bioAr: string | null;
  bioEn: string | null;
  profileImage: string | null;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
  basePrice: number;
  ratingAvg: number | null;
  ratingCount: number;
  licenseVerified: boolean;
  packageCount: number;
}

export interface GuideDetail {
  id: string;
  userId: string;
  bioAr: string | null;
  bioEn: string | null;
  profileImage: string | null;
  coverImage: string | null;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
  licenseNumber: string;
  licenseVerified: boolean;
  basePrice: number;
  ratingAvg: number | null;
  ratingCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  packageCount: number;
  reviewCount: number;
}

export interface GuideFilters {
  language?: string;
  specialty?: string;
  area?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const guidesAPI = {
  getAll: (filters?: GuideFilters) =>
    apiFetch<PaginatedResponse<GuideListItem>>(`/guides${toQueryString(filters)}`),
  getById: (id: string) =>
    apiFetch<GuideDetail>(`/guides/${id}`),
  getPackages: (guideId: string, params?: { page?: number; limit?: number }) =>
    apiFetch<PaginatedResponse<GuidePackageListItem>>(
      `/guides/${guideId}/packages${toQueryString(params)}`
    ),
};

// ── Tour Packages ───────────────────────────────────────────────────────────

interface TourPackageBase {
  id: string;
  titleAr: string;
  titleEn: string | null;
  description: string | null;
  durationHours: number;
  maxPeople: number;
  price: number;
  includes: string[] | null;
  images: string[] | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface TourPackageListItem extends TourPackageBase {
  guideId: string;
  guideBioAr: string | null;
  guideBioEn: string | null;
  guideProfileImage: string | null;
  guideRatingAvg: number | null;
  guideRatingCount: number;
  guideLicenseVerified: boolean;
  attractionSlugs: string[];
}

export interface GuidePackageListItem extends TourPackageBase {
  attractionSlugs: string[];
}

export interface TourPackageDetail extends TourPackageBase {
  guideId: string;
  guideBioAr: string | null;
  guideBioEn: string | null;
  guideProfileImage: string | null;
  guideRatingAvg: number | null;
  guideRatingCount: number;
  guideLicenseVerified: boolean;
  linkedAttractions: {
    id: string;
    nameAr: string;
    nameEn: string | null;
    slug: string;
    thumbnail: string | null;
    type: AttractionType;
    area: AttractionArea;
    sortOrder: number;
  }[];
}

export interface PackageFilters {
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minPeople?: number;
  search?: string;
  guideId?: string;
  attractionId?: string;
  page?: number;
  limit?: number;
}

export const packagesAPI = {
  getAll: (filters?: PackageFilters) =>
    apiFetch<PaginatedResponse<TourPackageListItem>>(`/packages${toQueryString(filters)}`),
  getById: (id: string) =>
    apiFetch<TourPackageDetail>(`/packages/${id}`),
};

// ── Legacy: Bookings + Reviews (mock — no backend yet, used by BookingsPage) ──
// TODO(T15): Replace with real booking endpoints when backend is ready
// TODO(T18): Replace with real review endpoints when backend is ready

export interface Booking {
  id: string;
  package_id: number;
  guide_id: number;
  guide_name: string;
  tourist_id: string;
  package_title: string;
  booking_date: string;
  start_time: string;
  people_count: number;
  total_price: number;
  status: string;
  created_at: string;
}

export interface Review {
  id: string;
  guide_id: number;
  tourist_id: string;
  tourist_name: string;
  rating: number;
  comment: string;
  guide_reply?: string;
  created_at: string;
}

export const bookingsAPI = {
  getMyBookings: () => apiFetch<{ success: boolean; data: Booking[] }>('/guides/bookings/my'),
  createBooking: (body: {
    package_id: number;
    guide_id: number;
    booking_date: string;
    start_time?: string;
    people_count?: number;
    notes?: string;
  }) =>
    apiFetch<{ success: boolean; message: string; data: Booking }>('/guides/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const reviewsAPI = {
  getReviews: (guideId: number) =>
    apiFetch<{ success: boolean; data: Review[] }>(`/guides/${guideId}/reviews`),
  createReview: (guideId: number, body: { rating: number; comment: string }) =>
    apiFetch<{ success: boolean; data: Review }>(`/guides/${guideId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
```

- [ ] **Step 3: Update `BookingsPage.tsx` import**

In `apps/web/src/pages/profile/BookingsPage.tsx`, change line 6 from:
```typescript
import { guidesAPI, type Booking } from '@/services/api';
```
to:
```typescript
import { bookingsAPI, type Booking } from '@/services/api';
```

And change line 31 from `guidesAPI.getMyBookings()` to `bookingsAPI.getMyBookings()`.

- [ ] **Step 4: Verify build**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Type errors in pages that still reference old types (e.g., `Accommodation`, `tourismAPI`). That's expected — we'll fix those in later tasks. No errors in `api.ts` itself or `BookingsPage.tsx`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api.ts apps/web/src/pages/profile/BookingsPage.tsx
git commit -m "feat(web): replace mock tourism/guide API types with real backend shapes

Preserve Booking/Review types and mock API methods (bookingsAPI, reviewsAPI)
for BookingsPage until T15/T18 implement real endpoints."
```

---

## Task 3: Query Keys and React Query Hooks

**Files:**
- Modify: `apps/web/src/lib/query-keys.ts`
- Create: `apps/web/src/hooks/use-attractions.ts`
- Create: `apps/web/src/hooks/use-guides.ts`
- Create: `apps/web/src/hooks/use-packages.ts`

- [ ] **Step 1: Update `apps/web/src/lib/query-keys.ts`**

Replace the entire file content:

```typescript
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  tourism: {
    attractions: (filters?: Record<string, unknown>) =>
      ['tourism', 'attractions', filters] as const,
    attraction: (slug: string) => ['tourism', 'attractions', slug] as const,
  },
  guides: {
    all: (filters?: Record<string, unknown>) => ['guides', filters] as const,
    detail: (id: string) => ['guides', id] as const,
    packages: (guideId: string) => ['guides', guideId, 'packages'] as const,
  },
  packages: {
    all: (filters?: Record<string, unknown>) => ['packages', filters] as const,
  },
  market: {
    listings: (filters?: Record<string, unknown>) => ['market', 'listings', filters] as const,
    listing: (id: string) => ['market', 'listings', id] as const,
  },
  investment: {
    opportunities: (filters?: Record<string, unknown>) =>
      ['investment', 'opportunities', filters] as const,
    opportunity: (id: string) => ['investment', 'opportunities', id] as const,
  },
  map: {
    pois: (filters?: Record<string, unknown>) => ['map', 'pois', filters] as const,
    carpool: (filters?: Record<string, unknown>) => ['map', 'carpool', filters] as const,
  },
  search: {
    results: (query: string, filters?: Record<string, unknown>) =>
      ['search', query, filters] as const,
  },
  ai: {
    sessions: () => ['ai', 'sessions'] as const,
    session: (id: string) => ['ai', 'sessions', id] as const,
  },
};
```

- [ ] **Step 2: Create `apps/web/src/hooks/use-attractions.ts`**

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { attractionsAPI, type AttractionFilters } from '@/services/api';

export function useAttractions(filters?: AttractionFilters) {
  return useQuery({
    queryKey: queryKeys.tourism.attractions(filters),
    queryFn: () => attractionsAPI.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

export function useAttraction(slug: string) {
  return useQuery({
    queryKey: queryKeys.tourism.attraction(slug),
    queryFn: () => attractionsAPI.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useNearbyAttractions(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.tourism.attraction(slug), 'nearby'] as const,
    queryFn: () => attractionsAPI.getNearby(slug),
    enabled: !!slug,
  });
}
```

- [ ] **Step 3: Create `apps/web/src/hooks/use-guides.ts`**

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { guidesAPI, type GuideFilters } from '@/services/api';

export function useGuides(filters?: GuideFilters) {
  return useQuery({
    queryKey: queryKeys.guides.all(filters),
    queryFn: () => guidesAPI.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

export function useGuide(id: string) {
  return useQuery({
    queryKey: queryKeys.guides.detail(id),
    queryFn: () => guidesAPI.getById(id),
    enabled: !!id,
  });
}

export function useGuidePackages(
  guideId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: [...queryKeys.guides.packages(guideId), params] as const,
    queryFn: () => guidesAPI.getPackages(guideId, params),
    enabled: !!guideId,
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 4: Create `apps/web/src/hooks/use-packages.ts`**

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { packagesAPI, type PackageFilters } from '@/services/api';

export function usePackages(filters?: PackageFilters) {
  return useQuery({
    queryKey: queryKeys.packages.all(filters),
    queryFn: () => packagesAPI.getAll(filters),
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 5: Verify build**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors from hooks or query-keys files. Existing page errors still expected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/query-keys.ts apps/web/src/hooks/use-attractions.ts apps/web/src/hooks/use-guides.ts apps/web/src/hooks/use-packages.ts
git commit -m "feat(web): add React Query hooks for attractions, guides, and packages"
```

---

## Task 4: Routes — Update `App.tsx`

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Update imports**

Remove these imports (lines 62-66):
```typescript
import GuideBookingPage from './pages/tourism/GuideBookingPage';
import AccommodationDetailsPage from './pages/tourism/AccommodationDetailsPage';
import AccommodationInquiryPage from './pages/tourism/AccommodationInquiryPage';
```

Add this import:
```typescript
import PackagesPage from './pages/tourism/PackagesPage';
```

- [ ] **Step 2: Update routes**

Replace the Tourism route section (lines 138-147):

```typescript
{/* Tourism */}
<Route path="/tourism" element={<TourismPage />} />
<Route path="/tourism/attractions" element={<AttractionsPage />} />
<Route path="/tourism/attraction/:slug" element={<AttractionDetailsPage />} />
<Route path="/tourism/packages" element={<PackagesPage />} />
```

This removes the guide-booking, accommodation, and accommodation-inquiry routes; changes `:id` to `:slug` for attractions; and adds the new packages route.

- [ ] **Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Error about `PackagesPage` not existing yet (we'll create it in Task 9). Everything else should be clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): update routes — slug attractions, add packages, remove dead routes"
```

---

## Task 5: Rewire TourismPage and FeaturedSection

**Files:**
- Rewrite: `apps/web/src/pages/TourismPage.tsx` (364 lines → ~220 lines)
- Rewrite: `apps/web/src/components/home/FeaturedSection.tsx` (~90 lines)

**Key changes:**
- Replace `useState`+`useEffect` with `useAttractions({ featured: true, limit: 6 })` and `useGuides({ limit: 6 })`
- Remove housing tab (no backend), keep 2 tabs: attractions and guides
- Replace `attraction.title` → `attraction.nameAr`, `attraction.image` → `attraction.thumbnail`
- Replace `attraction.rating` → `attraction.ratingAvg`, `attraction.id` → `attraction.slug` in links
- Replace `guide.name` → `guide.bioAr`, `guide.image` → `guide.profileImage`
- Replace `guide.price_per_day` → `formatEGP(guide.basePrice)`
- Guide cards link to `/guides/${guide.id}` instead of `/tourism/guide-booking/${guide.id}`

- [ ] **Step 1: Rewrite TourismPage**

Replace the entire file with the updated component. The structure stays the same (Layout → PageTransition → PageHero → Tabs) but with 2 tabs, hooks for data, and corrected field names. Use `isLoading` from the hook instead of manual `loading` state. Use `data?.data` to access the paginated response's data array.

Key template changes for the attractions tab:
- `{attraction.title}` → `{attraction.nameAr}`
- `src={attraction.image}` → `src={attraction.thumbnail ?? '/placeholder.jpg'}`
- `{attraction.rating}` → `{attraction.ratingAvg?.toFixed(1) ?? '—'}`
- `{attraction.duration}` → `{attraction.durationHours ? `${attraction.durationHours} ساعة` : ''}`
- `attraction.featured` filter → `attraction.isFeatured` (or use the `featured: true` filter param)
- `navigate(\`/tourism/attraction/${attraction.id}\`)` → `navigate(\`/tourism/attraction/${attraction.slug}\`)`
- `{attraction.type}` → `{attractionTypeLabels[attraction.type]}`

Key template changes for the guides tab:
- `{guide.name}` → `{guide.bioAr?.slice(0, 50) ?? ''}` (no name field in list response)
- `src={guide.image}` → `src={guide.profileImage ?? '/placeholder.jpg'}`
- `{guide.rating}` → `{guide.ratingAvg?.toFixed(1) ?? '—'}`
- `({guide.reviews} تقييم)` → `({guide.ratingCount} تقييم)`
- `{guide.price_per_day}` → `{formatEGP(guide.basePrice)}`
- Navigate to `/guides/${guide.id}` instead of booking page
- Remove "احجز" (Book) button text, replace with "عرض الملف" (View Profile)

- [ ] **Step 2: Rewire FeaturedSection**

`apps/web/src/components/home/FeaturedSection.tsx` also imports `tourismAPI` and the old `Attraction` type. Rewrite it to use `useAttractions({ featured: true, limit: 4 })` hook instead.

Key changes:
- Replace `import { tourismAPI, type Attraction }` → `import { useAttractions }` from hooks + `type Attraction` from api
- Replace `useState` + `useEffect` + `tourismAPI.getFeatured()` → `const { data, isLoading } = useAttractions({ featured: true, limit: 4 })`
- `{attraction.title}` → `{attraction.nameAr}`
- `src={attraction.image}` → `src={attraction.thumbnail ?? '/placeholder.jpg'}`
- `{attraction.rating}` → `{attraction.ratingAvg?.toFixed(1) ?? '—'}`
- `{attraction.duration}` → `{attraction.durationHours ? \`${attraction.durationHours} ساعة\` : ''}`
- Link: `/tourism/attraction/${attraction.id}` → `/tourism/attraction/${attraction.slug}`

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from TourismPage or FeaturedSection.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/TourismPage.tsx apps/web/src/components/home/FeaturedSection.tsx
git commit -m "feat(web): rewire TourismPage and FeaturedSection to real backend"
```

---

## Task 6: Rewire AttractionsPage

**Files:**
- Rewrite: `apps/web/src/pages/tourism/AttractionsPage.tsx` (237 lines)

**Key changes:**
- Remove hardcoded `allAttractions` array (mock data)
- Use `useAttractions(filters)` hook
- Add filter state: `type`, `area`, `search` with dropdowns and debounced search input
- Add "load more" button when `data.hasMore`
- Fix all field names per spec

- [ ] **Step 1: Rewrite AttractionsPage**

Replace the entire file. New structure:

```
AttractionsPage:
  - Layout → PageTransition
  - Filter bar: type dropdown, area dropdown, search input
  - Card grid: thumbnail, nameAr, area badge, type badge, ratingAvg, durationHours
  - Load more button
  - Cards link to /tourism/attraction/${slug}
```

Filter state pattern:
```typescript
const [filters, setFilters] = useState<AttractionFilters>({ page: 1, limit: 12 });
const { data, isLoading, isFetching } = useAttractions(filters);

// Type filter dropdown onChange
const handleTypeChange = (value: string) => {
  setFilters(prev => ({ ...prev, type: value === 'all' ? undefined : value as AttractionType, page: 1 }));
};

// Load more
const handleLoadMore = () => {
  setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }));
};
```

> **Load-more accumulation pattern** (reuse this in all list pages):

```typescript
const [page, setPage] = useState(1);
const [filters, setFilters] = useState<AttractionFilters>({ page: 1, limit: 12 });
const [accumulated, setAccumulated] = useState<Attraction[]>([]);
const { data, isLoading, isFetching } = useAttractions(filters);

// Accumulate results when new page data arrives
useEffect(() => {
  if (!data?.data) return;
  setAccumulated(prev =>
    filters.page === 1 ? data.data : [...prev, ...data.data]
  );
}, [data, filters.page]);

// Reset to page 1 when filters change (type, area, search)
const updateFilter = (patch: Partial<AttractionFilters>) => {
  setAccumulated([]);
  setFilters(prev => ({ ...prev, ...patch, page: 1 }));
};

// Load more appends next page
const loadMore = () => {
  setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }));
};

// Render `accumulated` in the grid, show "Load more" when `data?.hasMore`
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/tourism/AttractionsPage.tsx
git commit -m "feat(web): rewire AttractionsPage — real API, filters, pagination"
```

---

## Task 7: Rewire AttractionDetailsPage

**Files:**
- Rewrite: `apps/web/src/pages/tourism/AttractionDetailsPage.tsx` (319 lines)

**Key changes:**
- Use `useParams<{ slug: string }>()` instead of `:id`
- Use `useAttraction(slug)` + `useNearbyAttractions(slug)` hooks
- Fix all field names: `nameAr`, `descriptionAr`, `historyAr`, `ratingAvg`, `reviewCount`, `durationHours`, etc.
- Handle `entryFee` JSONB defensively (check each field exists before rendering)
- Display `tips` array, `bestSeason`, `bestTimeOfDay`, `difficulty` with Arabic labels
- Show nearby attractions grid at bottom
- Map display uses `location.x` (longitude) and `location.y` (latitude) — note xy mapping (PostGIS returns x=lng, y=lat)

- [ ] **Step 1: Rewrite AttractionDetailsPage**

Replace the entire file. New structure:

```
AttractionDetailsPage:
  - Layout → PageTransition
  - Loading: CardSkeleton
  - Error: error message + refetch button
  - Hero: images gallery (or single thumbnail fallback)
  - Info section: nameAr, descriptionAr, historyAr
  - Details grid: durationHours, difficulty, bestSeason, bestTimeOfDay, openingHours
  - Entry fee: defensive JSONB rendering
  - Tips list
  - Map placeholder (if location exists)
  - Nearby attractions grid
```

EntryFee rendering pattern:
```typescript
{attraction.entryFee && (
  <div>
    <h3>رسوم الدخول</h3>
    {attraction.entryFee.adultsPiasters != null && (
      <p>بالغين: {formatEGP(attraction.entryFee.adultsPiasters)}</p>
    )}
    {attraction.entryFee.childrenPiasters != null && (
      <p>أطفال: {formatEGP(attraction.entryFee.childrenPiasters)}</p>
    )}
    {attraction.entryFee.foreignersPiasters != null && (
      <p>أجانب: {formatEGP(attraction.entryFee.foreignersPiasters)}</p>
    )}
  </div>
)}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/tourism/AttractionDetailsPage.tsx
git commit -m "feat(web): rewire AttractionDetailsPage — slug route, hooks, nearby section"
```

---

## Task 8: Rewire GuidesPage and GuideProfilePage

**Files:**
- Rewrite: `apps/web/src/pages/guides/GuidesPage.tsx` (145 lines)
- Rewrite: `apps/web/src/pages/guides/GuideProfilePage.tsx` (180 lines)

### GuidesPage

- [ ] **Step 1: Rewrite GuidesPage**

**Key changes:**
- Use `useGuides(filters)` hook
- Add filter state: language, specialty, area, price range, search
- Card uses `GuideListItem` fields: `profileImage`, `bioAr`, `languages`, `specialties`, `ratingAvg`, `ratingCount`, `basePrice`, `packageCount`
- Use `languageLabels` and `specialtyLabels` for Arabic display
- Cards link to `/guides/${guide.id}`
- Load more button when `data.hasMore`

New structure:
```
GuidesPage:
  - Layout → PageTransition → PageHero
  - Filter bar: language select, specialty select, area select, search input
  - Card grid: profileImage, bioAr excerpt, language badges, specialty badges, rating, price, package count
  - Load more button
```

- [ ] **Step 2: Verify GuidesPage compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

### GuideProfilePage

- [ ] **Step 3: Rewrite GuideProfilePage**

**Key changes:**
- Use `useParams<{ id: string }>()` to get guide ID
- Use `useGuide(id)` + `useGuidePackages(id)` hooks
- Display `GuideDetail` fields: coverImage, profileImage, bioAr, languages, specialties, areasOfOperation, licenseVerified badge, ratingAvg, ratingCount, reviewCount, packageCount
- Show packages list with `GuidePackageListItem` fields: titleAr, durationHours, price, maxPeople, includes, attractionSlugs as links
- Load more for packages when `data.hasMore`

New structure:
```
GuideProfilePage:
  - Layout → PageTransition
  - Loading: skeleton
  - Error: error + refetch
  - Cover image + profile image overlap
  - Info: bioAr, verified badge, rating, stats (packageCount, reviewCount)
  - Tags: languages, specialties, areas
  - Packages section: card list with titleAr, price, duration, max people
```

- [ ] **Step 4: Verify GuideProfilePage compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 5: Commit both**

```bash
git add apps/web/src/pages/guides/GuidesPage.tsx apps/web/src/pages/guides/GuideProfilePage.tsx
git commit -m "feat(web): rewire GuidesPage and GuideProfilePage — real API, filters, packages"
```

---

## Task 9: Create PackagesPage

**Files:**
- Create: `apps/web/src/pages/tourism/PackagesPage.tsx`

- [ ] **Step 1: Create PackagesPage**

New page for browsing all tour packages. Uses `usePackages(filters)` hook.

Structure:
```
PackagesPage:
  - Layout → PageTransition → PageHero (reuse tourism hero)
  - Filter bar: area select, price range inputs, duration range, search
  - Card grid: titleAr, durationHours, price (formatEGP), maxPeople
  - Each card shows embedded guide info: guideProfileImage, guideBioAr excerpt, guideRatingAvg
  - attractionSlugs rendered as links to /tourism/attraction/:slug
  - Load more button
```

Card layout per package:
```typescript
<Card>
  <CardContent>
    <h3>{pkg.titleAr}</h3>
    <div className="flex items-center gap-2 text-sm">
      <Clock /> {pkg.durationHours} ساعة
      <Users /> حتى {pkg.maxPeople} أشخاص
    </div>
    <p className="text-muted-foreground line-clamp-2">{pkg.description}</p>
    {/* Guide info */}
    <div className="flex items-center gap-3 mt-4">
      <img src={pkg.guideProfileImage} className="h-10 w-10 rounded-full" />
      <div>
        <p className="text-sm">{pkg.guideBioAr?.slice(0, 40)}</p>
        <div className="flex items-center gap-1">
          <Star /> {pkg.guideRatingAvg?.toFixed(1)}
        </div>
      </div>
    </div>
    {/* Price */}
    <div className="mt-4 flex justify-between items-center">
      <span className="text-xl font-bold text-primary">{formatEGP(pkg.price)}</span>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 2: Verify full build succeeds**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Zero errors. All pages, hooks, and types should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/tourism/PackagesPage.tsx
git commit -m "feat(web): add PackagesPage — browse all tour packages with filters"
```

---

## Task 10: Final Cleanup and Verification

**Files:**
- Possibly modify: `apps/web/src/services/api.ts` (remove unused old types if any remain)
- Check: all files compile, no unused imports

- [ ] **Step 1: Remove any leftover references to old types**

Search for any remaining references to the deleted types or mock APIs:

Run: `cd apps/web && grep -rn 'tourismAPI\|Accommodation\|GuideProfile\|guide_reply\|createBooking\|getMyBookings\|createReview\|getReviews' src/ --include='*.ts' --include='*.tsx' | head -20`

If any references remain in files outside our scope (e.g., other pages that import from `api.ts`), ensure they don't break. The old `Booking`, `Review` types can stay in `api.ts` if other pages reference them — but they should not since those features aren't built yet. If they are referenced, leave a `// TODO(T15): wire to real booking endpoints` comment.

- [ ] **Step 2: Full type check**

Run: `cd apps/web && npx tsc --noEmit --pretty`
Expected: Zero errors.

- [ ] **Step 3: Full lint check**

Run: `cd apps/web && npx eslint src/ 2>&1 | tail -5`
Expected: No new errors (existing warnings may exist).

- [ ] **Step 4: Dev server smoke test**

Run: `cd apps/web && npx vite build 2>&1 | tail -5`
Expected: Build succeeds without errors.

- [ ] **Step 5: Commit any cleanup**

```bash
git add -A apps/web/src/
git commit -m "chore(web): cleanup unused types and imports from F03 rewire"
```

---

## Summary

| Task | What | Files | Commits |
|------|------|-------|---------|
| 1 | Utilities | `format.ts`, `query-string.ts` | 1 |
| 2 | API types | `api.ts`, `BookingsPage.tsx` (import fix) | 1 |
| 3 | Hooks + keys | `query-keys.ts`, 3 hook files | 1 |
| 4 | Routes | `App.tsx` | 1 |
| 5 | TourismPage + FeaturedSection | `TourismPage.tsx`, `FeaturedSection.tsx` | 1 |
| 6 | AttractionsPage | `AttractionsPage.tsx` | 1 |
| 7 | AttractionDetailsPage | `AttractionDetailsPage.tsx` | 1 |
| 8 | Guides pages | `GuidesPage.tsx`, `GuideProfilePage.tsx` | 1 |
| 9 | PackagesPage | `PackagesPage.tsx` | 1 |
| 10 | Cleanup | Various | 1 |
| **Total** | | **16 files** | **10 commits** |
