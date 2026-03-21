# F04 — Market Frontend Integration Design

> Wire existing Market frontend pages to real backend APIs via React Query hooks.

## Scope

**In scope:**
- Replace mock/hardcoded data in 4 existing pages + 1 home widget with real API calls
- Create React Query hooks for Price Index and Business Directory
- Add piasters → EGP formatting utility
- Add district enum → Arabic label mapping

**Out of scope:**
- Investment Opportunities (T17 backend not implemented)
- Listings page (no existing frontend page)
- Listing Reviews (T14 backend not implemented)
- New page creation or UI redesign
- Merchant CRUD flows (create/edit listing, create business)

## Data Mapping

| Frontend concept | Backend entity | API endpoint |
|---|---|---|
| Prices (commodities) | Price Index + Commodities | `GET /api/v1/price-index`, `GET /api/v1/price-index/summary` |
| Suppliers | Business Directory | `GET /api/v1/businesses`, `GET /api/v1/businesses/:id` |

### Key transformations

- **Money**: Backend stores integer piasters (1 EGP = 100 piasters). Frontend displays formatted EGP via `formatPrice()` utility.
- **Districts**: Backend uses enum values (`KHARGA`, `DAKHLA`, `FARAFRA`, `BARIS`, `BALAT`). Frontend shows Arabic names (`الخارجة`, `الداخلة`, `الفرافرة`, `باريس`, `بلاط`).
- **Commodity categories**: Backend uses enum (`fruits`, `grains`, `vegetables`, `oils`, `livestock`, `other`). Frontend shows Arabic labels (`فواكه`, `حبوب`, `خضروات`, `زيوت`, `مواشي`, `أخرى`).
- **Price changes**: Backend price index includes `changePercent` — maps directly to UI trend indicators.

## File Structure

### New files (3)

```
apps/web/src/
├── hooks/
│   ├── use-price-index.ts     # usePriceIndex(), usePriceSummary()
│   └── use-businesses.ts      # useBusinesses(), useBusiness()
├── lib/
│   └── format.ts              # formatPrice(), districtLabel(), categoryLabel()
```

### Modified files (6)

```
apps/web/src/
├── services/api.ts                         # Replace marketAPI with priceIndexAPI + businessesAPI
├── lib/query-keys.ts                       # Add priceIndex + businesses query keys
├── pages/MarketplacePage.tsx               # Use hooks instead of useEffect
├── pages/marketplace/PricesPage.tsx        # Replace hardcoded data with hooks
├── pages/marketplace/SupplierDetailsPage.tsx # Replace hardcoded data with hook
├── components/home/PriceSnapshot.tsx       # Use hook instead of useEffect
```

## API Client

Replace the existing `marketAPI` block in `api.ts` with two new API objects matching the real backend routes.

### Response types

Verified against backend source (`commodity-prices.service.ts:formatPriceIndexRow`, `getPriceSummary`, `business-directory.service.ts:findAll/findById`).

```typescript
// Price Index entry (from GET /api/v1/price-index)
// Backend: formatPriceIndexRow() returns a NESTED structure
interface PriceIndexEntry {
  commodity: {
    id: string;
    nameAr: string;
    nameEn: string | null;
    unit: string;          // 'kg' | 'ton' | 'ardeb' | 'kantar' | 'liter' | 'piece' | 'box'
    category: string;      // 'fruits' | 'grains' | 'vegetables' | 'oils' | 'livestock' | 'other'
  };
  latestPrice: number;       // piasters
  previousPrice: number | null;
  changePiasters: number | null;
  changePercent: number | null;
  region: string;
  priceType: string;
  recordedAt: string;        // ISO datetime
}

// Price Summary (from GET /api/v1/price-index/summary)
// Backend: getPriceSummary() builds this manually
interface PriceSummaryResponse {
  totalCommodities: number;
  totalPriceEntries: number;
  lastUpdated: string | null;   // ISO datetime or null
  topMovers: Array<{
    commodity: { id: string; nameAr: string };
    changePercent: number | null;
    direction: 'up' | 'down' | null;
  }>;
  categoryAverages: Array<{
    category: string;
    avgPrice: number;           // piasters (rounded integer)
    commodityCount: number;     // NOT "count"
  }>;
}

// Linked commodity (used in Business Directory responses)
interface LinkedCommodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  unit: string;
}

// Business Directory entry (from GET /api/v1/businesses)
// Backend: findAll() returns full BusinessDirectory row + commodities[]
// Both list and detail endpoints include commodities
interface BusinessEntry {
  id: string;
  ownerId: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  description: string | null;
  descriptionAr: string | null;
  district: string | null;
  location: unknown | null;     // PostGIS point (not used in frontend)
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  status: string;               // 'active' | 'inactive'
  verificationStatus: string;   // 'pending' | 'verified' | 'rejected' | 'suspended'
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  commodities: LinkedCommodity[];  // always included, even in list
}
```

Note: `BusinessEntry` is used for both list and detail endpoints — the backend returns the same shape for both. The `findById` response is identical (full row + commodities).

### API functions

```typescript
export const priceIndexAPI = {
  getIndex: (params?: {
    category?: string;
    region?: string;
    price_type?: string;
    limit?: number;
    offset?: number;
  }) => apiFetch<PaginatedResponse<PriceIndexEntry>>(`/price-index${toQueryString(params)}`),

  getSummary: () => apiFetch<PriceSummaryResponse>('/price-index/summary'),
};

export const businessesAPI = {
  getAll: (params?: {
    category?: string;
    district?: string;
    commodity_id?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => apiFetch<PaginatedResponse<BusinessEntry>>(`/businesses${toQueryString(params)}`),

  getById: (id: string) => apiFetch<BusinessEntry>(`/businesses/${id}`),
};
```

Note: A `toQueryString()` helper builds `?key=value&...` from an object, skipping undefined values. Define it in `api.ts` alongside `apiFetch`.

### PaginatedResponse

The backend returns paginated data. The shared types package already defines:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

This should be imported from `@hena-wadeena/types` if available, otherwise defined locally.

## React Query Hooks

Following the pattern established by `use-notifications.ts`.

### `use-price-index.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { priceIndexAPI } from '@/services/api';

export function usePriceIndex(filters?: {
  category?: string;
  region?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.priceIndex(filters),
    queryFn: () => priceIndexAPI.getIndex(filters),
  });
}

export function usePriceSummary() {
  return useQuery({
    queryKey: queryKeys.market.priceSummary(),
    queryFn: () => priceIndexAPI.getSummary(),
  });
}
```

### `use-businesses.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { businessesAPI } from '@/services/api';

export function useBusinesses(filters?: {
  category?: string;
  district?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.businesses(filters),
    queryFn: () => businessesAPI.getAll(filters),
  });
}

export function useBusiness(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.market.business(id!),
    queryFn: () => businessesAPI.getById(id!),
    enabled: !!id,
  });
}
```

### Query keys update

```typescript
// In lib/query-keys.ts — replace market block
market: {
  priceIndex: (filters?: Record<string, unknown>) => ['market', 'price-index', filters] as const,
  priceSummary: () => ['market', 'price-summary'] as const,
  businesses: (filters?: Record<string, unknown>) => ['market', 'businesses', filters] as const,
  business: (id: string) => ['market', 'businesses', id] as const,
},
```

## Utility — `format.ts`

```typescript
/** Convert piasters (integer) to formatted EGP string */
export function formatPrice(piasters: number): string {
  const egp = piasters / 100;
  return egp.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** District enum → Arabic display name */
export const districtLabels: Record<string, string> = {
  KHARGA: 'الخارجة',
  DAKHLA: 'الداخلة',
  FARAFRA: 'الفرافرة',
  BARIS: 'باريس',
  BALAT: 'بلاط',
};

export function districtLabel(district: string): string {
  return districtLabels[district] ?? district;
}

/** Commodity category enum → Arabic display name */
export const categoryLabels: Record<string, string> = {
  fruits: 'فواكه',
  grains: 'حبوب',
  vegetables: 'خضروات',
  oils: 'زيوت',
  livestock: 'مواشي',
  other: 'أخرى',
};

export function categoryLabel(category: string): string {
  return categoryLabels[category] ?? category;
}

/** Commodity unit enum → Arabic display name */
export const unitLabels: Record<string, string> = {
  kg: 'كجم',
  ton: 'طن',
  ardeb: 'أردب',
  kantar: 'قنطار',
  liter: 'لتر',
  piece: 'قطعة',
  box: 'صندوق',
};

export function unitLabel(unit: string): string {
  return unitLabels[unit] ?? unit;
}
```

## Page Wiring Details

### 1. `PriceSnapshot.tsx` (home widget)

**Before:** `useEffect` → `marketAPI.getPrices()` → `setPriceData(r.data.slice(0, 6))`
**After:** `usePriceIndex({ limit: 6 })`

Changes:
- Remove `useState` for priceData and loading
- Replace with `const { data, isLoading } = usePriceIndex({ limit: 6 })`
- Map `data.data` entries to table rows
- Use `formatPrice(entry.latestPrice)` + `unitLabel(entry.commodity.unit)` for price display
- Use `entry.changePercent` for trend indicators
- Use `entry.commodity.nameAr` for product name (nested under `commodity`)
- Keep existing skeleton/table structure

### 2. `MarketplacePage.tsx` (hub)

**Before:** `useEffect` → `Promise.all([marketAPI.getPrices(), marketAPI.getSuppliers()])` → state
**After:** `usePriceIndex(filters)` + `useBusinesses(filters)`

Changes:
- Remove `useState` for priceData, suppliers, loading
- Prices tab: `const { data: pricesData, isLoading: pricesLoading } = usePriceIndex({ region: selectedCity === 'all' ? undefined : selectedCity.toUpperCase() })`
- Suppliers tab: `const { data: suppliersData, isLoading: suppliersLoading } = useBusinesses()`
- Map `selectedCity` → `region` filter on usePriceIndex
- Price table fields: `entry.commodity.nameAr` → name, `entry.commodity.category` → category, `formatPrice(entry.latestPrice)` + `unitLabel(entry.commodity.unit)` → price, `entry.changePercent` → trend
- Map business fields: `nameAr` → name, `districtLabel(district)` → city, `verificationStatus === 'verified'` → verified badge, `commodities` → specialties (map `c.nameAr`)
- Supplier card: link to `/marketplace/supplier/${business.id}` (id is now UUID string)
- Client-side `searchQuery` filtering stays (filter on `commodity.nameAr` for prices, `nameAr` for businesses)

### 3. `PricesPage.tsx` (detailed board)

**Before:** Hardcoded `priceData` array of 12 items
**After:** `usePriceIndex(filters)` + `usePriceSummary()`

Changes:
- Remove hardcoded `priceData` constant
- `const { data: indexData, isLoading } = usePriceIndex({ category, region, limit: 100 })`
- `const { data: summary } = usePriceSummary()`
- Stats cards: use `summary.totalCommodities`, derive gainers/losers count from `summary.topMovers` by `direction`
- Top gainers/losers: use `summary.topMovers` — filter by `direction === 'up'` (gainers) / `direction === 'down'` (losers). Display `mover.commodity.nameAr` and `mover.changePercent`
- Note: `topMovers` does NOT include `latestPrice`, `category`, or `unit` — only `commodity.id`, `commodity.nameAr`, `changePercent`, and `direction`. The top movers cards will show name + change% only (no price column)
- Filter `selectedCity` → `region` query param (skip client-side city filter)
- Filter `selectedCategory` → map Arabic label back to enum value → `category` query param
- Price table: map entries using `entry.commodity.nameAr`, `categoryLabel(entry.commodity.category)`, `districtLabel(entry.region)`, `formatPrice(entry.latestPrice)` + `unitLabel(entry.commodity.unit)`, `entry.changePercent`
- "آخر تحديث" timestamp: use `summary.lastUpdated` formatted

### 4. `SupplierDetailsPage.tsx` (supplier profile)

**Before:** Hardcoded `suppliersData` object with 4 entries
**After:** `useBusiness(id)`

Changes:
- Remove hardcoded `suppliersData` constant
- `const { id } = useParams()` stays (but `id` is now a UUID string)
- `const { data: business, isLoading, error } = useBusiness(id!)`
- Map fields: `nameAr` → name, `districtLabel(district)` → city, `descriptionAr || description` → description, `phone` → phone, `website` → website link (backend has no email field — replace the email button with website link or hide if null)
- `verificationStatus === 'verified'` → verified badge
- Products table: map `business.commodities` to product rows (name from `nameAr`, unit from `unitLabel()`)
- Note: individual commodity prices are not included in the business detail response. The products table will show commodity names and units but not prices per-business. This is a backend limitation — the junction table only links businesses to commodities without per-business pricing.
- Add loading skeleton state
- Add error/not-found state (navigate back or show message)
- Remove hardcoded `experience` and `workingHours` fields (not in backend schema)

## Error Handling

- React Query's `isError` / `error` states used for each hook
- Failed requests show a simple Arabic error message: "حدث خطأ في تحميل البيانات"
- `SupplierDetailsPage` shows 404 state if business not found
- Network errors fall through to the existing `apiFetch` error handling (401 → auth callback)

## Testing Considerations

- Hooks can be unit tested with `@testing-library/react-hooks` + MSW
- Pages are tested via existing patterns (if any E2E tests exist)
- `formatPrice()` and label utilities are pure functions — easy to unit test
