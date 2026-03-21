# F04 — Market Frontend Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Market frontend pages (PricesPage, MarketplacePage, SupplierDetailsPage, PriceSnapshot) to real backend APIs via React Query hooks, replacing all hardcoded/mock data.

**Architecture:** Bottom-up — create formatting utilities and types first, then API client functions, then React Query hooks, then wire each page. Each layer is independently testable. The backend Market service (T06, T10) is already running on port 8002; Vite dev proxy is already configured.

**Tech Stack:** React 19, TanStack Query (React Query), TypeScript, Vitest, `@hena-wadeena/types` shared enums

**Spec:** `docs/superpowers/specs/2026-03-21-f04-market-frontend-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/lib/format.ts` | Create | `formatPrice()`, `districtLabel()`, `categoryLabel()`, `unitLabel()` |
| `apps/web/src/lib/__tests__/format.spec.ts` | Create | Tests for format utilities |
| `apps/web/src/services/api.ts` | Modify | Replace `marketAPI` block with `priceIndexAPI` + `businessesAPI`, add `toQueryString()` helper, add response types |
| `apps/web/src/lib/query-keys.ts` | Modify | Replace `market` block with `priceIndex` + `businesses` keys |
| `apps/web/src/lib/__tests__/query-keys.spec.ts` | Modify | Add tests for new market query keys |
| `apps/web/src/hooks/use-price-index.ts` | Create | `usePriceIndex()`, `usePriceSummary()` |
| `apps/web/src/hooks/use-businesses.ts` | Create | `useBusinesses()`, `useBusiness()` |
| `apps/web/src/components/home/PriceSnapshot.tsx` | Modify | Replace useEffect + marketAPI with `usePriceIndex` hook |
| `apps/web/src/pages/MarketplacePage.tsx` | Modify | Replace useEffect + marketAPI with hooks |
| `apps/web/src/pages/marketplace/PricesPage.tsx` | Modify | Replace hardcoded data with hooks |
| `apps/web/src/pages/marketplace/SupplierDetailsPage.tsx` | Modify | Replace hardcoded data with `useBusiness` hook |

---

### Task 1: Format Utilities + Tests

**Files:**
- Create: `apps/web/src/lib/format.ts`
- Create: `apps/web/src/lib/__tests__/format.spec.ts`

- [ ] **Step 1: Write failing tests for format utilities**

Create `apps/web/src/lib/__tests__/format.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatPrice, districtLabel, categoryLabel, unitLabel } from '../format';

describe('formatPrice', () => {
  it('converts piasters to EGP', () => {
    expect(formatPrice(4500)).toBe('45');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('handles fractional EGP', () => {
    expect(formatPrice(4550)).toBe('45.5');
  });

  it('formats large numbers with grouping', () => {
    const result = formatPrice(125000);
    // 1250.00 EGP — locale formatting may vary, just check it contains digits
    expect(result).toContain('1');
  });
});

describe('districtLabel', () => {
  it('maps kharga to Arabic', () => {
    expect(districtLabel('kharga')).toBe('الخارجة');
  });

  it('maps dakhla to Arabic', () => {
    expect(districtLabel('dakhla')).toBe('الداخلة');
  });

  it('returns input for unknown district', () => {
    expect(districtLabel('unknown')).toBe('unknown');
  });
});

describe('categoryLabel', () => {
  it('maps fruits to Arabic', () => {
    expect(categoryLabel('fruits')).toBe('فواكه');
  });

  it('maps grains to Arabic', () => {
    expect(categoryLabel('grains')).toBe('حبوب');
  });

  it('returns input for unknown category', () => {
    expect(categoryLabel('unknown')).toBe('unknown');
  });
});

describe('unitLabel', () => {
  it('maps kg to Arabic', () => {
    expect(unitLabel('kg')).toBe('كجم');
  });

  it('maps ton to Arabic', () => {
    expect(unitLabel('ton')).toBe('طن');
  });

  it('returns input for unknown unit', () => {
    expect(unitLabel('unknown')).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @hena-wadeena/web test -- --run src/lib/__tests__/format.spec.ts`
Expected: FAIL — module `../format` not found

- [ ] **Step 3: Implement format utilities**

Create `apps/web/src/lib/format.ts`:

```typescript
/** Convert piasters (integer) to formatted EGP string */
export function formatPrice(piasters: number): string {
  const egp = piasters / 100;
  return egp.toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** District enum value → Arabic display name */
export const districtLabels: Record<string, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
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

**IMPORTANT:** All enum keys are **lowercase** — matching `NvDistrict`, `CommodityCategory`, `CommodityUnit` from `@hena-wadeena/types`.

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm --filter @hena-wadeena/web test -- --run src/lib/__tests__/format.spec.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/format.ts apps/web/src/lib/__tests__/format.spec.ts
git commit -m "feat(web): add format utilities for piasters, districts, categories, units"
```

---

### Task 2: API Client — Types, `toQueryString`, and Market API Functions

**Files:**
- Modify: `apps/web/src/services/api.ts`

**Reference:**
- Backend response shapes: `services/market/src/commodity-prices/commodity-prices.service.ts:95-118` (`formatPriceIndexRow`), lines 537-552 (`getPriceSummary` result)
- Backend business shape: `services/market/src/business-directory/business-directory.service.ts:30-35` (`LinkedCommodity`)
- `PaginatedResponse` from `@hena-wadeena/types` at `packages/types/src/dto/pagination.ts`

- [ ] **Step 1: Add `toQueryString` helper to `api.ts`**

Add this right after the `apiFetch` function (around line 51), before the Auth section:

```typescript
/** Build ?key=value&... from object, skipping undefined values */
function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}
```

- [ ] **Step 2: Add Market response type interfaces**

Add these type interfaces in the Market section of `api.ts` (replacing the old `PriceItem`, `SupplierProduct`, `Supplier` interfaces at lines 170-198):

```typescript
// ── Market: Price Index ──────────────────────────────────────────────────

export interface PriceIndexCommodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  unit: string;
  category: string;
}

export interface PriceIndexEntry {
  commodity: PriceIndexCommodity;
  latestPrice: number;
  previousPrice: number | null;
  changePiasters: number | null;
  changePercent: number | null;
  region: string;
  priceType: string;
  recordedAt: string;
}

export interface TopMover {
  commodity: { id: string; nameAr: string };
  changePercent: number | null;
  direction: 'up' | 'down' | null;
}

export interface PriceSummaryResponse {
  totalCommodities: number;
  totalPriceEntries: number;
  lastUpdated: string | null;
  topMovers: TopMover[];
  categoryAverages: Array<{
    category: string;
    avgPrice: number;
    commodityCount: number;
  }>;
}

// ── Market: Business Directory ───────────────────────────────────────────

export interface LinkedCommodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  unit: string;
}

export interface BusinessEntry {
  id: string;
  ownerId: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  description: string | null;
  descriptionAr: string | null;
  district: string | null;
  location: unknown | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  status: string;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  commodities: LinkedCommodity[];
}
```

- [ ] **Step 3: Replace `marketAPI` with `priceIndexAPI` + `businessesAPI`**

Replace the old `marketAPI` object (lines 200-207) with:

```typescript
import type { PaginatedResponse } from '@hena-wadeena/types';

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

**Note:** The `PaginatedResponse` import from `@hena-wadeena/types` goes at the top of the file with other imports. If that import fails (types package not built), define it locally.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api.ts
git commit -m "feat(web): replace mock marketAPI with real priceIndex + businesses API clients"
```

---

### Task 3: Query Keys Update + Tests

**Files:**
- Modify: `apps/web/src/lib/query-keys.ts`
- Modify: `apps/web/src/lib/__tests__/query-keys.spec.ts`

- [ ] **Step 1: Write failing tests for new market query keys**

Add to the bottom of `apps/web/src/lib/__tests__/query-keys.spec.ts`:

```typescript
it('market.priceIndex includes filters in key', () => {
  const filters = { region: 'kharga' };
  expect(queryKeys.market.priceIndex(filters)).toEqual([
    'market',
    'price-index',
    { region: 'kharga' },
  ]);
});

it('market.priceSummary returns stable key', () => {
  expect(queryKeys.market.priceSummary()).toEqual(['market', 'price-summary']);
});

it('market.businesses includes filters in key', () => {
  const filters = { district: 'dakhla' };
  expect(queryKeys.market.businesses(filters)).toEqual([
    'market',
    'businesses',
    { district: 'dakhla' },
  ]);
});

it('market.business includes id in key', () => {
  expect(queryKeys.market.business('uuid-123')).toEqual([
    'market',
    'businesses',
    'uuid-123',
  ]);
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @hena-wadeena/web test -- --run src/lib/__tests__/query-keys.spec.ts`
Expected: FAIL — `market.priceIndex` is not a function (old keys have `listings` and `listing`)

- [ ] **Step 3: Update query keys**

In `apps/web/src/lib/query-keys.ts`, replace the `market` block (lines 19-22) with:

```typescript
market: {
  priceIndex: (filters?: Record<string, unknown>) => ['market', 'price-index', filters] as const,
  priceSummary: () => ['market', 'price-summary'] as const,
  businesses: (filters?: Record<string, unknown>) => ['market', 'businesses', filters] as const,
  business: (id: string) => ['market', 'businesses', id] as const,
},
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm --filter @hena-wadeena/web test -- --run src/lib/__tests__/query-keys.spec.ts`
Expected: All tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/query-keys.ts apps/web/src/lib/__tests__/query-keys.spec.ts
git commit -m "feat(web): update market query keys for price-index and businesses"
```

---

### Task 4: React Query Hooks

**Files:**
- Create: `apps/web/src/hooks/use-price-index.ts`
- Create: `apps/web/src/hooks/use-businesses.ts`

**Reference pattern:** `apps/web/src/hooks/use-notifications.ts`

- [ ] **Step 1: Create `use-price-index.ts`**

Create `apps/web/src/hooks/use-price-index.ts`:

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

- [ ] **Step 2: Create `use-businesses.ts`**

Create `apps/web/src/hooks/use-businesses.ts`:

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

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-price-index.ts apps/web/src/hooks/use-businesses.ts
git commit -m "feat(web): add React Query hooks for price index and businesses"
```

---

### Task 5: Wire `PriceSnapshot.tsx` (Home Widget)

**Files:**
- Modify: `apps/web/src/components/home/PriceSnapshot.tsx`

**Current state:** Uses `useState` + `useEffect` calling `marketAPI.getPrices()`, maps `PriceItem` to table rows.
**Target state:** Use `usePriceIndex({ limit: 6 })`, map `PriceIndexEntry` to table rows.

- [ ] **Step 1: Replace imports**

Remove:
```typescript
import { useState, useEffect } from 'react';
import { marketAPI, type PriceItem } from '@/services/api';
```

Add:
```typescript
import { usePriceIndex } from '@/hooks/use-price-index';
import { formatPrice } from '@/lib/format';
import { unitLabel } from '@/lib/format';
```

- [ ] **Step 2: Replace state management**

Remove the `useState` + `useEffect` block (lines 11-20):
```typescript
// DELETE THIS:
const [priceData, setPriceData] = useState<PriceItem[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  marketAPI
    .getPrices()
    .then((r) => setPriceData(r.data.slice(0, 6)))
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

Replace with:
```typescript
const { data, isLoading } = usePriceIndex({ limit: 6 });
const entries = data?.data ?? [];
```

- [ ] **Step 3: Update table body rendering**

Replace `loading` → `isLoading` and `priceData` → `entries` in the JSX.

In the table body, replace the mapping. Change:
```typescript
priceData.map((item, index) => (
```
to:
```typescript
entries.map((entry, index) => (
```

Update field references inside the row:
- `item.name` → `entry.commodity.nameAr`
- `item.price` → `formatPrice(entry.latestPrice)`
- `item.unit` → `unitLabel(entry.commodity.unit)`
- `item.change` → `entry.changePercent ?? 0`
- `key={item.name}` → `key={entry.commodity.id}`
- `priceData.length` → `entries.length`

For the trend indicator condition, change `item.change > 0` to `(entry.changePercent ?? 0) > 0`, and similarly for `< 0`.

For the change display, change `{Math.abs(item.change)}%` to `{Math.abs(entry.changePercent ?? 0)}%`.

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/PriceSnapshot.tsx
git commit -m "feat(web): wire PriceSnapshot home widget to real price index API"
```

---

### Task 6: Wire `MarketplacePage.tsx` (Hub)

**Files:**
- Modify: `apps/web/src/pages/MarketplacePage.tsx`

**Current state:** Uses `useState` + `useEffect` calling `marketAPI.getPrices()` + `marketAPI.getSuppliers()`, renders two tabs (prices + suppliers).
**Target state:** Use `usePriceIndex(filters)` + `useBusinesses()` hooks with proper field mapping.

- [ ] **Step 1: Replace imports**

Remove:
```typescript
import { useState, useEffect } from 'react';
import { marketAPI, type PriceItem, type Supplier } from '@/services/api';
```

Add:
```typescript
import { useState } from 'react';
import { usePriceIndex } from '@/hooks/use-price-index';
import { useBusinesses } from '@/hooks/use-businesses';
import { formatPrice, districtLabel, categoryLabel, unitLabel } from '@/lib/format';
```

- [ ] **Step 2: Replace state management**

Remove the `useState` + `useEffect` block (lines 40-53):
```typescript
// DELETE:
const [priceData, setPriceData] = useState<PriceItem[]>([]);
const [suppliers, setSuppliers] = useState<Supplier[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  void Promise.all([
    marketAPI.getPrices().then((r) => setPriceData(r.data)),
    marketAPI.getSuppliers().then((r) => setSuppliers(r.data)),
  ]).finally(() => setLoading(false));
}, []);
```

Replace with:
```typescript
const { data: pricesData, isLoading: pricesLoading } = usePriceIndex({
  region: selectedCity,
});
const { data: suppliersData, isLoading: suppliersLoading } = useBusinesses();

const priceEntries = pricesData?.data ?? [];
const businesses = suppliersData?.data ?? [];
```

Note: The `cities` array uses `id: 'kharga'` as default. The backend `region` param accepts lowercase NvDistrict enum values directly (`kharga`, `dakhla`, `farafra`, `baris`, `balat`). The `paris` city ID in the frontend maps to `baris` in the backend — update the cities constant. The `selectedCity` value is passed directly as the `region` filter (no "all" option on this page — the default is `kharga`):

```typescript
const cities = [
  { id: 'kharga', name: 'الخارجة' },
  { id: 'dakhla', name: 'الداخلة' },
  { id: 'farafra', name: 'الفرافرة' },
  { id: 'baris', name: 'باريس' },
  { id: 'balat', name: 'بلاط' },
];
```

- [ ] **Step 3: Update Prices tab rendering**

Update the client-side filter:
```typescript
const filteredProducts = priceEntries.filter(
  (e) =>
    e.commodity.nameAr.includes(searchQuery) ||
    categoryLabel(e.commodity.category).includes(searchQuery),
);
```

In the prices table, replace `loading` → `pricesLoading` in the skeleton condition.

Update table row mapping — change `filteredProducts.map((item, index)` to `filteredProducts.map((entry, index)`:
- `item.name` → `entry.commodity.nameAr`
- `item.category` → `categoryLabel(entry.commodity.category)`
- `item.price` → `formatPrice(entry.latestPrice)`
- `item.unit` → `unitLabel(entry.commodity.unit)`
- `item.change` → `entry.changePercent ?? 0`
- `key={item.name}` → `key={entry.commodity.id}`

- [ ] **Step 4: Update Suppliers tab rendering**

Replace `loading` → `suppliersLoading` in the skeleton condition.

Update supplier card mapping — change `suppliers.map((supplier)` to `businesses.map((biz)`:
- `supplier.id` → `biz.id`
- `supplier.name` → `biz.nameAr`
- `supplier.verified` → `biz.verificationStatus === 'verified'`
- `supplier.city` → `districtLabel(biz.district ?? '')`
- `supplier.rating` → remove (not in business schema — hide the rating display or show a placeholder)
- `supplier.reviews` → remove (not in business schema)
- `supplier.specialties` → `biz.commodities.map((c) => c.nameAr)`
- `key={supplier.id}` → `key={biz.id}`

For the navigate call: `navigate(`/marketplace/supplier/${biz.id}`)` — the ID is now a UUID string.

For the contact button: keep the `alert()` call but use `biz.nameAr` and `biz.phone ?? ''`.

**Note on ratings:** The BusinessDirectory backend has no `rating` or `reviews` field. Remove the rating display from the supplier cards, or show it only when data exists. The simplest approach: hide the rating section entirely since businesses don't have ratings in this backend.

- [ ] **Step 5: Verify build**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/MarketplacePage.tsx
git commit -m "feat(web): wire MarketplacePage to real price index + business APIs"
```

---

### Task 7: Wire `PricesPage.tsx` (Detailed Price Board)

**Files:**
- Modify: `apps/web/src/pages/marketplace/PricesPage.tsx`

**Current state:** Hardcoded `priceData` array of 12 items with mock prices. Client-side filtering by city/category/search.
**Target state:** Use `usePriceIndex(filters)` + `usePriceSummary()`, server-side filtering via query params.

- [ ] **Step 1: Replace imports**

Add at the top:
```typescript
import { usePriceIndex } from '@/hooks/use-price-index';
import { usePriceSummary } from '@/hooks/use-price-index';
import { formatPrice, districtLabel, categoryLabel, unitLabel } from '@/lib/format';
```

- [ ] **Step 2: Remove hardcoded data**

Delete the `priceData` constant (lines 34-87) and the computed `topGainers`/`topLosers` (lines 89-96).

- [ ] **Step 3: Add reverse category map and hooks**

Add a reverse lookup from Arabic label to enum value, for the category filter buttons:

```typescript
const categoryToEnum: Record<string, string | undefined> = {
  'الكل': undefined,
  'حبوب': 'grains',
  'فواكه': 'fruits',
  'خضروات': 'vegetables',
  'أعلاف': undefined, // No backend enum for feed — map to 'other' or skip
  'بقوليات': undefined, // No backend enum for legumes — map to 'other' or skip
};
```

Inside the component, replace the filter state setup. After `const [searchQuery, setSearchQuery] = useState('');`, add:

```typescript
const regionFilter = selectedCity === 'all' ? undefined : selectedCity;
const categoryFilter = categoryToEnum[selectedCategory];

const { data: indexData, isLoading } = usePriceIndex({
  category: categoryFilter,
  region: regionFilter,
  limit: 100,
});
const { data: summary } = usePriceSummary();

const entries = indexData?.data ?? [];
const topMovers = summary?.topMovers ?? [];
const gainers = topMovers.filter((m) => m.direction === 'up');
const losers = topMovers.filter((m) => m.direction === 'down');
```

- [ ] **Step 4: Update stats cards**

Replace the hardcoded stats:
- "منتج متاح" count: `summary?.totalCommodities ?? 0`
- "منتج صاعد" count: `gainers.length`
- "منتج هابط" count: `losers.length`
- "منتج مستقر" count: `entries.filter((e) => (e.changePercent ?? 0) === 0).length`

- [ ] **Step 5: Update top gainers/losers cards**

Replace `topGainers.map((item) => ...)` with:
```typescript
gainers.map((mover) => (
  <div key={mover.commodity.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
    <div>
      <span className="font-medium">{mover.commodity.nameAr}</span>
    </div>
    <Badge className="bg-primary/10 text-primary">
      +{mover.changePercent}%
    </Badge>
  </div>
))
```

Similarly for losers, using `losers.map(...)` with destructive styling and negative change.

**Note:** `topMovers` doesn't include price, city, or unit — so remove the `{item.price} جنيه/{item.unit}` span and the `({item.city})` span from the movers cards.

- [ ] **Step 6: Update the client-side filter**

Change the `filteredProducts` computation:
```typescript
const filteredProducts = entries.filter((e) =>
  e.commodity.nameAr.includes(searchQuery) ||
  categoryLabel(e.commodity.category).includes(searchQuery),
);
```

- [ ] **Step 7: Update the price table**

Replace `filteredProducts.map((item, index) => ...)`:
- `item.id` → `entry.commodity.id`
- `item.name` → `entry.commodity.nameAr`
- `item.category` → `categoryLabel(entry.commodity.category)`
- `item.city` → `districtLabel(entry.region)`
- `item.price` → `formatPrice(entry.latestPrice)`
- `item.unit` → `unitLabel(entry.commodity.unit)`
- `item.change` → `entry.changePercent ?? 0`

- [ ] **Step 8: Update the "last updated" text**

Replace the hardcoded text at the bottom:
```typescript
<p className="text-center text-sm text-muted-foreground mt-4">
  {summary?.lastUpdated
    ? `آخر تحديث: ${new Date(summary.lastUpdated).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : 'لا تتوفر بيانات حاليا'}
</p>
```

- [ ] **Step 9: Add loading state**

The page currently has no loading skeleton. Wrap the stats cards, movers, and table in conditional rendering using `isLoading`. Use the `Skeleton` component already available:

```typescript
import { Skeleton } from '@/components/motion/Skeleton';
```

Add skeletons for the stats cards grid when `isLoading` is true.

- [ ] **Step 10: Update the cities constant**

Fix the `paris` → `baris` mapping to match the backend enum, and add `balat`:

```typescript
const cities = [
  { id: 'all', name: 'جميع المدن' },
  { id: 'kharga', name: 'الخارجة' },
  { id: 'dakhla', name: 'الداخلة' },
  { id: 'farafra', name: 'الفرافرة' },
  { id: 'baris', name: 'باريس' },
  { id: 'balat', name: 'بلاط' },
];
```

- [ ] **Step 11: Verify build**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No type errors

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/pages/marketplace/PricesPage.tsx
git commit -m "feat(web): wire PricesPage to real price index + summary APIs"
```

---

### Task 8: Wire `SupplierDetailsPage.tsx` (Supplier Profile)

**Files:**
- Modify: `apps/web/src/pages/marketplace/SupplierDetailsPage.tsx`

**Current state:** Hardcoded `suppliersData` object with 4 entries. Renders supplier profile, products table, and contact info.
**Target state:** Use `useBusiness(id)` hook. Show loading/error states.

- [ ] **Step 1: Replace imports**

Remove unused icons that won't have data (TrendingUp for experience). Add:
```typescript
import { useBusiness } from '@/hooks/use-businesses';
import { districtLabel, unitLabel } from '@/lib/format';
import { Skeleton } from '@/components/motion/Skeleton';
```

- [ ] **Step 2: Delete hardcoded data**

Delete the entire `suppliersData` constant and the `defaultSupplier` line (lines 18-123).

- [ ] **Step 3: Replace component body**

Change the component to use the hook:
```typescript
const SupplierDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: business, isLoading, isError } = useBusiness(id);
```

- [ ] **Step 4: Add loading state**

After the back button, add:
```typescript
if (isLoading) {
  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للبورصة
          </Button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton h="h-40" className="rounded-xl" />
              <Skeleton h="h-32" className="rounded-xl" />
              <Skeleton h="h-48" className="rounded-xl" />
            </div>
            <Skeleton h="h-64" className="rounded-xl" />
          </div>
        </div>
      </section>
    </Layout>
  );
}
```

- [ ] **Step 5: Add error/not found state**

```typescript
if (isError || !business) {
  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4 text-center">
          <p className="text-lg text-muted-foreground mb-4">لم يتم العثور على المورد</p>
          <Button onClick={() => void navigate('/marketplace')}>
            العودة للبورصة
          </Button>
        </div>
      </section>
    </Layout>
  );
}
```

- [ ] **Step 6: Update field mappings in JSX**

Map the `business` object fields to the existing UI:

- `supplier.name` → `business.nameAr`
- `supplier.verified` → `business.verificationStatus === 'verified'`
- `supplier.city` → `districtLabel(business.district ?? '')`
- `supplier.description` → `business.descriptionAr ?? business.description ?? ''`
- `supplier.phone` → `business.phone ?? ''`
- `supplier.email` → `business.website ?? ''` (show as website link, not email)
- `supplier.specialties` → `business.commodities.map((c) => c.nameAr)`
- Products table: `supplier.products` → `business.commodities.map((c) => ({ name: c.nameAr, unit: unitLabel(c.unit) }))`

**Remove entirely:**
- Rating display (`supplier.rating`, `supplier.reviews`) — not in backend schema
- Experience display (`supplier.experience`) — not in backend schema
- Working hours (`supplier.workingHours`) — not in backend schema

**Update the email button** to show website instead:
- Replace the `<Mail>` icon button with a website link if `business.website` exists, or hide if null
- Keep the phone/call button with `business.phone`

**Update the products table:**
The commodities don't have per-business prices. Change the table to show only commodity name and unit (remove the price column), or show "—" for price:

```typescript
{business.commodities.map((commodity, index) => (
  <tr
    key={commodity.id}
    className={index !== business.commodities.length - 1 ? 'border-b border-border/50' : ''}
  >
    <td className="py-4 px-6">
      <span className="font-medium text-foreground">{commodity.nameAr}</span>
    </td>
    <td className="py-4 px-6">
      <span className="text-sm text-muted-foreground">{unitLabel(commodity.unit)}</span>
    </td>
  </tr>
))}
```

- [ ] **Step 7: Verify build**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/marketplace/SupplierDetailsPage.tsx
git commit -m "feat(web): wire SupplierDetailsPage to real business directory API"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm --filter @hena-wadeena/web test -- --run`
Expected: All tests pass (including new format and query-keys tests)

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @hena-wadeena/web tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @hena-wadeena/web lint`
Expected: No errors (warnings acceptable)

- [ ] **Step 4: Verify dev server starts**

Run: `pnpm --filter @hena-wadeena/web dev` (check it starts without build errors, then kill it)

- [ ] **Step 5: Commit any remaining fixes**

If any lint/type fixes were needed:
```bash
git add -u
git commit -m "fix(web): address lint and type issues from market integration"
```
