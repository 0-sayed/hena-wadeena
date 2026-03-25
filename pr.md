# PR #41 — feat: infinite scroll pagination

> Generated: 2026-03-25 | Branch: feat/infinite-scroll-pagination | Last updated: 2026-03-25 02:05

## Worth Fixing

- [x] `usePaginatedQuery` query key omits `limit`, causing cache collisions between components with different page sizes — @devin-ai-integration, @coderabbitai <!-- thread:PRRT_kwDORjaF4M52j25U --> <!-- thread:PRRT_kwDORjaF4M52kOW3 -->
  > **apps/web/src/hooks/use-paginated-query.ts:43**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-931a2d7f41dc42cf84ec4a24e29a3852_0001", "file_path": "apps/web/src/hooks/use-paginated-query.ts", "start_line": 42, "end_line": 43, "side": "RIGHT"} -->
  >
  > 🔴 **Query key omits `limit`, causing cache collisions between components requesting different page sizes**
  >
  > The `usePaginatedQuery` hook does not include the `limit` in the query key passed to `useInfiniteQuery`. Since the query key uniquely identifies cached data, two components using the same filters but different limits will share one cache entry, causing one to display data fetched with the other's page size.
  >
  > Confirmed conflicting call sites:
  > - **FeaturedSection** (`apps/web/src/components/home/FeaturedSection.tsx:12`) uses `useAttractions({ featured: true }, 4)` — key `['tourism', 'attractions', { featured: true }]`
  > - **TourismPage** (`apps/web/src/pages/TourismPage.tsx:28-31`) uses `useAttractions({ featured: true }, 6)` — **same key**, limit=6
  > - **PriceSnapshot** (`apps/web/src/components/home/PriceSnapshot.tsx:12`) uses `usePriceIndex({ region: 'kharga' }, 6)` — key `['market', 'price-index', { region: 'kharga' }]`
  > - **MarketplacePage** (`apps/web/src/pages/MarketplacePage.tsx:33-39`) uses `usePriceIndex({ region: 'kharga' })` — **same key**, default limit=20
  >
  > With `staleTime` set to 10–15 minutes, navigating from the home page to the Tourism or Marketplace page will serve stale cached data fetched with the wrong page size (e.g., TourismPage shows 4 featured items instead of 6).

  > **apps/web/src/components/home/PriceSnapshot.tsx:12**
  >
  > **`queryKey` must include `limit` to prevent cache collisions across different page sizes.**
  >
  > `usePaginatedQuery` passes `limit` to the API call but does not include it in the `useInfiniteQuery` key (line 47 of `use-paginated-query.ts`). When `usePriceIndex` is called with the same filters but different limits—like `PriceSnapshot` requesting `{ region: 'kharga' }` with `limit: 6` and `PricesPage` requesting the same region without an explicit limit (defaulting to 20)—both will share the same cache entry. This causes incorrect data to be displayed: the second caller receives the smaller dataset from the first caller instead of fetching its own page size.
  >
  > Fix: Include `limit` in the query key construction (e.g., `[...options.queryKey, limit]`).

- [x] PricesPage regression: `limit: 100` removed without adding pagination controls — @gemini-code-assist, @devin-ai-integration, @coderabbitai <!-- thread:PRRT_kwDORjaF4M52jzNL --> <!-- thread:PRRT_kwDORjaF4M52j26H --> <!-- thread:PRRT_kwDORjaF4M52kOXD -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:39**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The refactoring to use the new `usePriceIndex` hook has unintentionally changed the number of items fetched from 100 to the default of 20. Since this page displays a static table without a 'Load More' button, it's likely that a larger limit is desired.
  >
  > To restore the previous behavior, please pass the limit as the second argument to `usePriceIndex`.
  >
  > ```suggestion
  >   const { data: indexData, isLoading } = usePriceIndex({
  >     category: selectedCategory,
  >     region: regionFilter,
  >   }, 100);
  > ```

  > **apps/web/src/pages/marketplace/PricesPage.tsx:39**
  >
  > 🔴 **PricesPage regression: `limit: 100` removed without adding pagination controls, showing only 20 of ~100 items**
  >
  > The PricesPage previously called `usePriceIndex({ …, limit: 100 })` via `useQuery` to fetch a near-complete price board at once. The migration to `usePaginatedQuery` removed `limit: 100` (defaulting to 20) but did not add a `LoadMoreButton` or destructure any pagination props (`hasNextPage`, `fetchNextPage`, `isFetchingNextPage`). As a result:
  > 1. Users see only the first 20 prices with no way to load the rest
  > 2. The stats bar (rising/falling/stable counts at `apps/web/src/pages/marketplace/PricesPage.tsx:47-49`) is computed on only 20 items instead of the full dataset, producing misleading numbers
  > 3. The client-side search filter (`filteredProducts`) only searches within the first 20 items

  > **apps/web/src/pages/marketplace/PricesPage.tsx:42**
  >
  > **Finish the `usePriceIndex` migration here.**
  >
  > `data` is the flattened entries array now. Line 91 still reads `indexData.total` (which matches the provided `tsc` failure), and dropping the old explicit limit means this screen only renders the default first page because it has no `fetchNextPage`/`LoadMoreButton` path. Either restore the larger explicit limit for this non-paginated board or wire pagination through this page, and read aggregate metadata separately from `data`.

- [x] Type Check failing — CI
  - [x] `Property 'total' does not exist on type 'PriceIndexEntry[]'` in PricesPage.tsx:91

- [x] Lint failing — CI
  - [x] `Unsafe spread of an 'any' value in an array` in use-paginated-query.ts:44

## Not Worth Fixing

- [x] ~~Include `limit` in `useAttractions` query key — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M52kOW7 -->
  - _Reason: Duplicate of the root cause in `usePaginatedQuery`. Fixing `usePaginatedQuery` to auto-append `limit` to the query key resolves this for all hooks without touching each one individually._
  > **apps/web/src/hooks/use-attractions.ts:16**
  >
  > **Include the effective `limit` in the attractions query key.**
  >
  > This cache-key bug is systematic: the query key is built from `filters` alone, but `limit` directly affects pagination boundaries. Two calls with identical filters but different limits will share cached data. When one calls `fetchNextPage()` after the other, page calculations become misaligned, causing skipped or duplicate attractions.
  >
  > The same issue affects `usePriceIndex`, `usePackages`, `useGuides`, and any hook that passes `limit` separately to `usePaginatedQuery`. Fix by including `limit` in the query key or modifying `usePaginatedQuery` to automatically append it.

- [x] ~~Include `limit` in `useGuides` query key — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M52kOW- -->
  - _Reason: Same root cause as above — duplicate symptom. Fix belongs in `usePaginatedQuery`, not per-hook._
  > **apps/web/src/hooks/use-guides.ts:13**
  >
  > **Include the effective `limit` in the guides query key.**
  >
  > `limit` is a separate parameter but `queryKeys.guides.all(filters)` only includes filters. When `useGuides` is called with the same filters but different limits (e.g., GuidesPage with limit=12 and TourismPage with limit=6), both calls share the same cache entry. This breaks pagination: cached pages from one window size will be reused with a different page size, skipping or duplicating guides.

- [x] ~~Include `limit` in `usePackages` query key — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M52kOXA -->
  - _Reason: Same root cause as above — duplicate symptom. Fix belongs in `usePaginatedQuery`, not per-hook._
  > **apps/web/src/hooks/use-packages.ts:12**
  >
  > **Include `limit` in the queryKey to prevent cache aliasing across different page sizes.**
  >
  > When `limit` differs, `queryKey` should differ too. Currently, two calls with identical filters but different `limit` values share the same infinite-query cache, causing their pagination state (pages, hasMore, pageParams) to collide. This can skip or duplicate items when the page size changes.

- [x] ~~Include `limit` in `usePriceIndex` query key — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M52kOXC -->
  - _Reason: Same root cause as above — duplicate symptom. Fix belongs in `usePaginatedQuery`, not per-hook._
  > **apps/web/src/hooks/use-price-index.ts:14**
  >
  > **Include `limit` in the cache key for price-index queries.**
  >
  > The query key is built only from `filters`, but `offset` is calculated as `(page - 1) * limit`. Two requests with identical filters but different page sizes will share the same cache entry, serving incorrect data. For example, page 2 at limit 20 (offset 20) and page 2 at limit 5 (offset 5) will collide in the cache.
