# PR #127 — feat: price alerts, produce listings page, and price trend charts

> Generated: 2026-04-12 | Branch: worktree-f16-price-alerts-produce-listings-ui | Last updated: 2026-04-13 15:30

## Worth Fixing


- [x] CI blocker: ESLint cannot parse listings.spec.ts — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56ZCDX -->
  > **services/market/src/db/seed-data/listings.spec.ts:1**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **CI blocker: ESLint cannot parse this file due to tsconfig configuration.**
  >
  > The pipeline fails because `allowDefaultProject` is set to `["services/*/test/*.e2e-spec.ts","gateway/*.spec.ts"]`, which doesn't match `services/market/src/db/seed-data/listings.spec.ts`.
  >
  > You need to either:
  > 1. Add `"services/*/src/**/*.spec.ts"` to `allowDefaultProject` in your ESLint config, or
  > 2. Include this file's path pattern in the project's `tsconfig.json`.
  >
  > <details>
  > <summary>🧰 Tools</summary>
  >
  > <details>
  > <summary>🪛 GitHub Actions: CI</summary>
  >
  > [error] 1-1: ESLint parsing error: /home/runner/work/hena-wadeena/hena-wadeena/services/market/src/db/seed-data/listings.spec.ts was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProject. (allowDefaultProject is set to ["services/*/test/*.e2e-spec.ts","gateway/*.spec.ts"], which does not match 'services/market/src/db/seed-data/listings.spec.ts')
  >
  > </details>
  >
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@services/market/src/db/seed-data/listings.spec.ts` at line 1, The ESLint
  > parsing error is due to tsconfig/ESLint project globs not covering
  > services/market/src/db/seed-data/listings.spec.ts; fix by updating the
  > configuration: either add the pattern "services/*/src/**/*.spec.ts" to the
  > ESLint setting allowDefaultProject, or add the file path pattern (e.g.,
  > "services/market/src/**/*.spec.ts" or "services/*/src/**/*.spec.ts") to the
  > project's tsconfig.json "include" (or the appropriate project list used by
  > ESLint) so that the test file is picked up and parsed; update the config that
  > contains allowDefaultProject or the tsconfig used by ESLint accordingly.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot:f2f123e4-464d-4dc8-a937-a252d3a58dd8 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Wrong login redirect `/auth/login` → 404 on bell click — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bRNw -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:97**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-7e2821fa361940d19079385b4fa51e9f_0001", "file_path": "apps/web/src/pages/marketplace/PricesPage.tsx", "start_line": 97, "end_line": 97, "side": "RIGHT"} -->
  >
  > 🔴 **Unauthenticated bell-click navigates to non-existent `/auth/login` route instead of `/login`**
  >
  > In `handleBellClick`, when the user is not authenticated, the code navigates to `/auth/login`. However, the login route defined in `apps/web/src/App.tsx:101` is `/login`, not `/auth/login`. Every other login redirect in the codebase (e.g., `apps/web/src/components/market/PriceAlertSheet.tsx:59`, `apps/web/src/pages/logistics/RideDetailPage.tsx:164`, `apps/web/src/pages/investment/ContactPage.tsx:158`) correctly uses `/login`. This means unauthenticated users clicking a price alert bell icon will land on the 404 page instead of the login page.
  >
  > ```suggestion
  >       void navigate('/login');
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/127" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [x] Banned `eslint-disable` suppresses `react-hooks/exhaustive-deps` warning — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bRON -->
  > **apps/web/src/pages/admin/AdminListings.tsx:132**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-7e2821fa361940d19079385b4fa51e9f_0002", "file_path": "apps/web/src/pages/admin/AdminListings.tsx", "start_line": 132, "end_line": 132, "side": "RIGHT"} -->
  >
  > 🔴 **Banned `eslint-disable` comment suppresses a warning-level rule**
  >
  > The `// eslint-disable-line react-hooks/exhaustive-deps` comment violates the project rule in AGENTS.md: "NEVER add `eslint-disable` comments to satisfy a warning-level rule — warnings are intentional review signals, not errors to suppress." The `ownerNames` dependency is intentionally omitted from the deps array to avoid an infinite re-fetch loop, which is a valid pattern, but per project rules the `eslint-disable` suppression should be removed and the warning should remain visible as a review signal.
  >
  > ```suggestion
  >   }, [listings, produceListings]);
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/127" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [x] Seed data uses invalid commodity types, breaking filters and labels — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bXQk -->
  > **services/market/src/db/seed-data/listings.ts:1164**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-68fa4d38ff39413fae39bf74e65d714c_0001", "file_path": "services/market/src/db/seed-data/listings.ts", "start_line": 1131, "end_line": 1164, "side": "RIGHT"} -->
  >
  > 🔴 **Seed data uses commodity types outside the allowed enum, breaking filters and labels**
  >
  > The `showcaseProduceListingDetails` seed array uses commodity types `'mangoes'`, `'peanuts'`, `'cumin'`, and `'oranges'`, but the application's schema (`create-listing.schema.ts:7`) and all frontend types (`ProduceDetails` in `apps/web/src/services/api.ts:892`, `ProduceCommodityType` in `apps/web/src/lib/format.ts:329`) only allow `'dates' | 'olives' | 'wheat' | 'other'`. These invalid seed values bypass DTO validation since they're inserted directly via Drizzle, but they cause three downstream problems: (1) `produceCommodityTypeLabel()` falls back to the raw English string (e.g. "mangoes") instead of an Arabic label; (2) the `PRODUCE_COMMODITY_TYPE_OPTIONS` filter buttons on `ProducePage` will never match these listings since "mangoes" isn't an option; (3) API queries filtering by `commodity_type` will reject these values at DTO validation. Four of the seven produce listings are effectively unfilterable.
  >
  > ```suggestion
  >     commodityType: 'other',
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/127" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [x] ProduceListingSheet skips `onSuccess` callback after create, breaking admin table refresh — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bXRR -->
  > **apps/web/src/components/market/ProduceListingSheet.tsx:243**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-68fa4d38ff39413fae39bf74e65d714c_0002", "file_path": "apps/web/src/components/market/ProduceListingSheet.tsx", "start_line": 228, "end_line": 243, "side": "RIGHT"} -->
  >
  > 🟡 **ProduceListingSheet skips `onSuccess` callback after creating a new listing**
  >
  > In the create path (non-edit mode) of `handleSubmit`, the `onSuccess?.()` callback is never called after the `createMutation` succeeds — only `resetForm()` and `onOpenChange(false)` are invoked (lines 241–242). In contrast, the update path at line 226 does call `onSuccess?.()`. The `AdminListings` page at `apps/web/src/pages/admin/AdminListings.tsx:759` passes `onSuccess={() => void refreshAdminListings()}` to trigger a cache refresh. Because this callback is skipped during creation, the admin "Agricultural Produce" table won't refresh to show the newly created listing until the user manually navigates away and back.
  >
  > ```suggestion
  >       onSuccess?.();
  >       resetForm();
  >       onOpenChange(false);
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/127" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [x] Client-side search on server-paginated data shows wrong totals and hides cross-page results — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bcUS -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:188**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-232f2e8c88b7453e9d9f3d7c311c5f85_0001", "file_path": "apps/web/src/pages/marketplace/PricesPage.tsx", "start_line": 184, "end_line": 188, "side": "RIGHT"} -->
  >
  > 🔴 **Client-side search filtering applied to server-paginated data produces incorrect pagination and hides results**
  >
  > The `searchQuery` is used to reset `currentPage` to 1 (line 112) and to filter entries client-side via `filteredProducts` (line 184-188), but it is never sent to the server. Since `usePriceIndexPage` at line 114-122 only sends `category`, `region`, and `price_type` to the API, the search only filters the current page of 20 items. This causes two problems: (1) pagination metadata (`totalProducts`, `pageStart`-`pageEnd` at `apps/web/src/pages/marketplace/PricesPage.tsx:189-190`) reflects the unfiltered server total, so the footer might say "عرض 1-20 من 150 منتج" while only 2 rows are visible; (2) matching items on pages 2+ are invisible to the user. By contrast, the `ProducePage` at `apps/web/src/pages/marketplace/ProducePage.tsx:43` correctly passes `q: debouncedSearch` to the server.
  >
  > *(Refers to lines 184-188)*
  >
  > <details>
  > <summary>Prompt for agents</summary>
  >
  > ```
  > In PricesPage.tsx, the search query (searchQuery state variable) is used to filter entries client-side via filteredProducts (line 184-188), but is NOT sent to the usePriceIndexPage server query (line 114-122). With server-side pagination of 20 items per page, this means the search only filters the current page's items, while pagination controls show the unfiltered total.
  >
  > Two possible approaches:
  > 1. Send the search query to the server: The priceIndexAPI.getIndex endpoint would need to support a q parameter (similar to how listings API does). Then pass the search to usePriceIndexPage as a filter and remove the client-side filteredProducts filtering.
  > 2. Remove searchQuery from the useEffect that resets the page (line 112) and add a visual indicator that the search only filters the current page view, not the full dataset. Also compute pagination text from filteredProducts.length instead of totalProducts.
  >
  > Approach 1 is recommended since ProducePage already demonstrates the pattern with debouncedSearch sent as the q parameter.
  > ```
  >
  > </details>
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/127" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [x] Seed produce listing details use freetext Arabic strings for enum fields — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bh-7 -->
  > **services/market/src/db/seed-data/listings.ts:1101**
  >
  > 🔴 **`showcaseProduceListingDetails` entries use Arabic freetext for `storageType`, `certifications`, and `preferredBuyer` instead of enum values**
  >
  > All 7 entries in `showcaseProduceListingDetails` set these fields to Arabic strings (e.g. `storageType: 'تعبئة كراتين في مخزن جاف'`, `certifications: ['فرز يدوي']`, `preferredBuyer: 'تجار جملة ومحلات منتجات محلية'`). The `create-listing.schema.ts` schema enforces strict Zod enums: `storage_type: z.enum(['field','warehouse','cold_storage'])`, `certifications: z.array(z.enum(['organic','gap','other']))`, and `preferred_buyer: z.enum(['any','wholesaler','exporter','local'])`. Since the seed bypasses DTO validation (direct Drizzle inserts), these invalid strings reach the database. This causes the same downstream problems as the commodity type issue: labels, filters, and queries that expect valid enum values will break or fall back to the raw string.
  >
  > Additionally, the `SeedProduceListingDetails` interface declares these fields as bare `string`, hiding the type error. Tighten the interface to literal union types matching the schema enums.

- [x] Rising/falling/stable stat cards computed from page subset, inconsistent with server total — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56bh_T -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:183**
  >
  > 🟡 **`risingCount`, `fallingCount`, `stableCount` are derived from the current page's 20 entries but displayed alongside `totalProducts` (server total)**
  >
  > Lines 183–185 compute counts by filtering `entries` (the current page, max 20 items). These are then shown in stat cards next to `totalProducts`, which reflects the server total (e.g. 100). Users see "8 rising / 5 falling / 7 stable" summing to 20, contradicting the "100 products" card above. The `getPriceSummary` API (`commodity-prices.service.ts:getPriceSummary`) returns `topMovers` (top 5 only) and category averages but no per-direction counts, so there's no server source for accurate rising/falling/stable totals without a backend change.

- [x] `priceIndexAPI.getIndex` type missing `q` param, bypasses type safety for search — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M56btgM -->
  > **apps/web/src/services/api.ts:615**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-015878235a9a4bfbb1dc410660abf51b_0001", "file_path": "apps/web/src/services/api.ts", "start_line": 615, "end_line": 621, "side": "RIGHT"} -->
  >
  > 🟡 **priceIndexAPI.getIndex type is missing the `q` parameter, bypassing type safety for search**
  >
  > The `priceIndexAPI.getIndex` parameter type at `apps/web/src/services/api.ts:615-620` does not include `q?: string`, but the backend DTO (`services/market/src/commodity-prices/dto/query-price-index.dto.ts:6`) accepts it, and the frontend `usePriceIndexPage` hook (`apps/web/src/hooks/use-price-index.ts:22`) passes it via spread (`{ ...filters, offset, limit }` where `filters` has type `PriceIndexFilters = { q?: string; ... }`). At runtime this works because `toQueryString` iterates all object keys, but it means direct callers of `priceIndexAPI.getIndex({ q: '...' })` would get a TypeScript error, and the `q` parameter completely bypasses type checking.
  >
  > *(Refers to lines 615-621)*
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/127" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

## Not Worth Fixing

- [x] ~~Edit-mode prefill reads camelCase keys from snake_case API data — @codoki-pr-intelligence~~ <!-- thread:PRRT_kwDORjaF4M56ZAdK -->
  - _Reason: The bot confused the two interfaces. `produceDetails` on the API response is typed as `ProduceDetailsResponse` (camelCase) — NestJS serializes to camelCase by default. The snake_case keys are only for the request payload. `pd?.commodityType` is correct._
  > **apps/web/src/components/market/ProduceListingSheet.tsx:108**
  >
  > <!-- CODOKI_INLINE -->
  > ⚠️ **High**: Edit-mode prefill reads camelCase keys (e.g., commodityType, storageType, quantityKg) from produceDetails, but the API types and submit payload use snake_case (commodity_type, storage_type, quantity_kg, etc.). This leaves fields empty in edit mode and risks overwriting persisted values with defaults on save (e.g., storage_type resets to 'field'). Align reads to snake_case keys to match the API type and payload.
  >
  > ```suggestion
  >     () => pd?.commodity_type ?? 'dates',
  > ```

- [x] ~~N+1 request pattern fetching owner display names individually — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M56Y-Mb -->
  - _Reason: Valid pattern to address eventually, but fixing it requires a backend join or bulk endpoint — out of scope for this PR. The current implementation deduplicates with `unseenIds` to avoid redundant requests within a session._
  > **apps/web/src/pages/admin/AdminListings.tsx:121**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > This implementation triggers an N+1 request pattern by fetching user details individually for every unique owner ID found in the listings. This can lead to a large number of simultaneous API calls as the admin scrolls or navigates pages. A more efficient approach would be to have the backend include the owner's display name in the listing response via a database join, or to provide a bulk user lookup endpoint.

- [x] ~~Base64 image upload in JSON payload — exceeds server size limits for large files — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M56Y-MZ -->
  - _Reason: S3 direct upload is a larger feature outside the scope of this PR. The existing `generateImageUploadUrl` endpoint will be the right foundation for that work — tracked separately._
  > **apps/web/src/components/market/ProduceListingSheet.tsx:282**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > Reading images as Data URLs and sending them as base64 strings in the JSON payload is inefficient and prone to failure for large files or multiple images (max 5 x 5MB = 25MB). This can easily exceed server-side request size limits. It is recommended to implement a proper upload flow: use the `generateImageUploadUrl` endpoint to upload files directly to S3 and then store only the resulting keys or URLs in the database.
