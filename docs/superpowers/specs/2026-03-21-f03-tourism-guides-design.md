# F03 — Tourism + Guides Frontend Design

> Wire tourism and guide pages to real guide-booking backend endpoints using React Query hooks.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Real endpoints only | Bookings (T15), reviews (T18), accommodation — no backend yet. Defer. |
| Data fetching | React Query hooks | Installed but unused. Sets the pattern for all future FE tasks. |
| Language | Arabic only (nameAr) | Current UI is all-Arabic. Bilingual toggle deferred. |
| Pagination | Basic "load more" | Backend returns PaginatedResponse. Prevents loading all records. |
| URL strategy | Slugs for attractions | Backend uses `/attractions/:slug`. SEO-friendly, matches API. |
| Approach | Incremental rewire | Fix types, add hooks, rewire pages one by one. Minimal UI disruption. |

---

## 1. Scope

### In Scope

| Page | Route | Backend Endpoint |
|------|-------|-----------------|
| TourismPage | `/tourism` | `GET /attractions` + `GET /guides` |
| AttractionsPage | `/tourism/attractions` | `GET /attractions` (with filters) |
| AttractionDetailsPage | `/tourism/attraction/:slug` | `GET /attractions/:slug` + `GET /attractions/:slug/nearby` |
| GuidesPage | `/guides` | `GET /guides` (with filters) |
| GuideProfilePage | `/guides/:id` | `GET /guides/:id` + `GET /guides/:id/packages` |
| PackagesPage | `/tourism/packages` | `GET /packages` (with filters) |

### Out of Scope

- **GuideBookingPage** — no booking backend (T15)
- **AccommodationDetailsPage / AccommodationInquiryPage** — no backend
- **BookingsPage** — no backend
- **Reviews write** — no review endpoints (T18)

### Route Changes

| Before | After | Reason |
|--------|-------|--------|
| `/tourism/attraction/:id` | `/tourism/attraction/:slug` | Backend uses slug-based lookup |
| `/tourism/guide-booking/:id` | _removed_ | No booking backend |
| `/tourism/accommodation/:id` | _removed_ | No backend |
| `/tourism/accommodation-inquiry/:id` | _removed_ | No backend |
| — | `/tourism/packages` | New packages browse page |

---

## 2. API Layer

### Shared Types

Import `PaginatedResponse<T>` from `@hena-wadeena/types` (already exported there) rather than redefining.

### Type Definitions

Replace mock types in `apps/web/src/services/api.ts` with types matching real backend response shapes. Backend endpoints return **different projections** for list vs. detail — types reflect this.

```typescript
import type { PaginatedResponse } from '@hena-wadeena/types';

// --- Enums ---
type AttractionType = 'attraction' | 'historical' | 'natural' | 'festival' | 'adventure';
type AttractionArea = 'kharga' | 'dakhla' | 'farafra' | 'baris' | 'balat';
type BestSeason = 'winter' | 'summer' | 'spring' | 'all_year';
type BestTimeOfDay = 'morning' | 'evening' | 'any';
type Difficulty = 'easy' | 'moderate' | 'hard';

// --- Attractions ---
// Backend returns full row from select() — same shape for list and detail.
interface Attraction {
  id: string;                    // UUID v7
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

interface AttractionFilters {
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

// --- Guides ---
// List endpoint (GET /guides) returns a projection — fewer fields + packageCount.
interface GuideListItem {
  id: string;
  bioAr: string | null;
  bioEn: string | null;
  profileImage: string | null;
  languages: string[];
  specialties: string[];
  areasOfOperation: string[];
  basePrice: number;              // piasters
  ratingAvg: number | null;
  ratingCount: number;
  licenseVerified: boolean;
  packageCount: number;           // computed subquery
}

// Detail endpoint (GET /guides/:id) returns more fields.
interface GuideDetail {
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
  basePrice: number;              // piasters
  ratingAvg: number | null;
  ratingCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  packageCount: number;           // computed subquery
  reviewCount: number;            // computed subquery
}

interface GuideFilters {
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

// --- Tour Packages ---
// List endpoints (GET /packages, GET /guides/:id/packages) return packages with
// embedded guide info and attraction slugs. Detail (GET /packages/:id) returns
// richer linkedAttractions objects.

// Shared base fields for all package responses.
interface TourPackageBase {
  id: string;
  titleAr: string;
  titleEn: string | null;
  description: string | null;
  durationHours: number;
  maxPeople: number;
  price: number;                  // piasters
  includes: string[] | null;
  images: string[] | null;
  status: 'active' | 'inactive'; // NOTE: field is "status", not "packageStatus"
  createdAt: string;
  updatedAt: string;
}

// From GET /packages (all packages list) — includes embedded guide info.
interface TourPackageListItem extends TourPackageBase {
  guideId: string;
  guideBioAr: string | null;
  guideBioEn: string | null;
  guideProfileImage: string | null;
  guideRatingAvg: number | null;
  guideRatingCount: number;
  guideLicenseVerified: boolean;
  attractionSlugs: string[];
}

// From GET /guides/:id/packages — no embedded guide info, just attraction slugs.
interface GuidePackageListItem extends TourPackageBase {
  attractionSlugs: string[];
}

// From GET /packages/:id — rich linked attractions.
interface TourPackageDetail extends TourPackageBase {
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

interface PackageFilters {
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
```

### API Functions

Split into dedicated namespaces. Each function is typed to the exact response shape its endpoint returns.

```typescript
export const attractionsAPI = {
  getAll: (filters?: AttractionFilters) =>
    apiFetch<PaginatedResponse<Attraction>>(`/attractions${toQueryString(filters)}`),
  getBySlug: (slug: string) =>
    apiFetch<Attraction>(`/attractions/${slug}`),
  getNearby: (slug: string, limit?: number, radiusKm?: number) =>
    apiFetch<Attraction[]>(`/attractions/${slug}/nearby${toQueryString({ limit, radiusKm })}`),
};

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

export const packagesAPI = {
  getAll: (filters?: PackageFilters) =>
    apiFetch<PaginatedResponse<TourPackageListItem>>(`/packages${toQueryString(filters)}`),
  getById: (id: string) =>
    apiFetch<TourPackageDetail>(`/packages/${id}`),
};
```

A small `toQueryString` utility builds URL query params from a filter object, omitting undefined values.

> **Note:** `packagesAPI.getById` is included for completeness since the endpoint exists. No dedicated PackageDetailsPage is planned — packages are viewed in context (guide profile or packages list). The function is available if needed later.

---

## 3. React Query Hooks

Location: `apps/web/src/hooks/`

### use-attractions.ts

```typescript
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
    queryKey: [...queryKeys.tourism.attraction(slug), 'nearby'],
    queryFn: () => attractionsAPI.getNearby(slug),
    enabled: !!slug,
  });
}
```

### use-guides.ts

```typescript
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
    queryKey: [...queryKeys.guides.packages(guideId), params],
    queryFn: () => guidesAPI.getPackages(guideId, params),
    enabled: !!guideId,
    placeholderData: keepPreviousData,
  });
}
```

### use-packages.ts

```typescript
export function usePackages(filters?: PackageFilters) {
  return useQuery({
    queryKey: queryKeys.packages.all(filters),
    queryFn: () => packagesAPI.getAll(filters),
    placeholderData: keepPreviousData,
  });
}
```

### Pagination Pattern

Hooks accept filter objects that include `page` and `limit`. Pages manage a `page` state variable and pass it into the hook. `placeholderData: keepPreviousData` (React Query v5) prevents content flash on page change.

Pagination UI: a "تحميل المزيد" (Load More) button rendered when `data.hasMore === true`.

---

## 4. Query Keys Update

Update `apps/web/src/lib/query-keys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys
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
  // ... other existing keys unchanged
};
```

> **Note:** The existing `tourism.attraction` parameter is renamed from `id` to `slug` for clarity (runtime behavior unchanged — both are strings).

---

## 5. Page Rewiring

### Error & Empty States

All pages follow the same pattern:
- **Loading:** Show `CardSkeleton` components (existing pattern).
- **Error:** Show a centered error message with a "حاول مرة أخرى" (Try Again) button that calls `refetch()`.
- **Empty:** Show a centered "لا توجد نتائج" (No results) message.

### TourismPage (`/tourism`)

- **Tabs:** 2 tabs — المعالم (attractions) and المرشدين (guides). Remove housing tab.
- **Data:** `useAttractions({ featured: true, limit: 6 })` for featured attractions, `useGuides({ limit: 6 })` for top guides.
- **Display:** Use `nameAr` for titles, format `basePrice` from piasters to EGP.
- **Navigation:** Attraction cards link to `/tourism/attraction/${slug}`, guide cards to `/guides/${id}`.
- **Nav links:** Remove any sidebar/header links to accommodation pages.

### AttractionsPage (`/tourism/attractions`)

- **Data:** `useAttractions(filters)` with filter state for type, area, search.
- **Filters:** Dropdowns for attraction type and area. Search input with debounce.
- **Cards:** Thumbnail, nameAr, area badge, type badge, ratingAvg, durationHours.
- **Pagination:** "Load more" button when `hasMore`.

### AttractionDetailsPage (`/tourism/attraction/:slug`)

- **Data:** `useAttraction(slug)` + `useNearbyAttractions(slug)`.
- **Display:** nameAr, descriptionAr, historyAr, images gallery, map (if location exists), entryFee formatted (handle JSONB defensively — check fields exist before rendering), tips list, opening hours, best season/time with Arabic labels.
- **Nearby:** Grid of nearby attraction cards at bottom.

### GuidesPage (`/guides`)

- **Data:** `useGuides(filters)` with filter state for language, specialty, area, price range.
- **Filters:** Multi-select for languages, specialties. Area dropdown. Price range inputs.
- **Cards:** profileImage, bioAr excerpt, languages badges, specialties badges, ratingAvg, basePrice, packageCount badge.
- **Pagination:** "Load more" button when `hasMore`.

### GuideProfilePage (`/guides/:id`)

- **Data:** `useGuide(id)` + `useGuidePackages(id)`.
- **Display:** Cover image, profile image, bioAr, languages, specialties, areas of operation, license verification badge, ratingAvg, reviewCount, packageCount.
- **Packages:** List of tour packages with titleAr, durationHours, price, maxPeople, includes, attractionSlugs as links.

### PackagesPage (`/tourism/packages`)

- **Data:** `usePackages(filters)` with filter state for area, price range, duration, people count.
- **Cards:** titleAr, durationHours, price formatted, maxPeople, embedded guide info (guideBioAr, guideProfileImage, guideRatingAvg), attractionSlugs.
- **Pagination:** "Load more" button when `hasMore`.

---

## 6. Utilities

### Price Formatting

```typescript
function formatEGP(piasters: number): string {
  const egp = piasters / 100;
  // Show decimals only if fractional piasters exist
  return egp % 1 === 0 ? `${egp} ج.م` : `${egp.toFixed(2)} ج.م`;
}
```

### Query String Builder

```typescript
function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
```

### Enum Display Labels (Arabic)

Maps for rendering enum values as Arabic labels in filters and detail pages:

```typescript
const attractionTypeLabels: Record<AttractionType, string> = {
  attraction: 'معلم سياحي',
  historical: 'تاريخي',
  natural: 'طبيعي',
  festival: 'مهرجان',
  adventure: 'مغامرة',
};

const areaLabels: Record<AttractionArea, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
};

const bestSeasonLabels: Record<BestSeason, string> = {
  winter: 'الشتاء',
  summer: 'الصيف',
  spring: 'الربيع',
  all_year: 'طوال العام',
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: 'سهل',
  moderate: 'متوسط',
  hard: 'صعب',
};
```

---

## 7. Files Changed

| File | Action |
|------|--------|
| `apps/web/src/services/api.ts` | Rewrite tourism/guide types to match real backend shapes, add attractionsAPI/guidesAPI/packagesAPI, add toQueryString, import PaginatedResponse from @hena-wadeena/types |
| `apps/web/src/hooks/use-attractions.ts` | New: useAttractions, useAttraction, useNearbyAttractions |
| `apps/web/src/hooks/use-guides.ts` | New: useGuides, useGuide, useGuidePackages |
| `apps/web/src/hooks/use-packages.ts` | New: usePackages |
| `apps/web/src/lib/query-keys.ts` | Update: add packages key, rename attraction param to slug |
| `apps/web/src/lib/format.ts` | New: formatEGP, enum label maps |
| `apps/web/src/pages/TourismPage.tsx` | Rewire: 2 tabs, use hooks, fix field names |
| `apps/web/src/pages/tourism/AttractionsPage.tsx` | Rewire: use hooks, add filters, pagination |
| `apps/web/src/pages/tourism/AttractionDetailsPage.tsx` | Rewire: use hooks, slug route, nearby section |
| `apps/web/src/pages/guides/GuidesPage.tsx` | Rewire: use hooks, add filters, pagination |
| `apps/web/src/pages/guides/GuideProfilePage.tsx` | Rewire: use hooks, packages list |
| `apps/web/src/pages/tourism/PackagesPage.tsx` | New page |
| `apps/web/src/App.tsx` | Update routes: slug for attractions, add packages route, remove dead routes |

---

## 8. Testing

- Verify each page loads and displays data from the real backend
- Verify filters update the displayed data
- Verify pagination ("load more") works
- Verify slug-based attraction URLs resolve correctly
- Verify error states (backend down, 404) display appropriate messages
- Verify loading skeletons appear during data fetch
- Verify entryFee JSONB is handled defensively (no crash on missing fields)
- Verify price formatting correctly converts piasters to EGP
