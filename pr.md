# PR #72 — feat: unified search across services

> Generated: 2026-03-31 | Branch: feat-unified-search | Last updated: 2026-03-31 16:45

## Worth Fixing

- [x] Query and inputValue state become stale when URL changes from Header navigation — @gemini-code-assist, @devin-ai-integration, @coderabbitai <!-- thread:PRRT_kwDORjaF4M530Xz4 --> <!-- thread:PRRT_kwDORjaF4M530ZIE --> <!-- thread:PRRT_kwDORjaF4M530idG -->
  > **apps/web/src/pages/search/SearchResultsPage.tsx:51**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The inputValue and query states are initialized from searchParams only when the component mounts. If a user performs a new search from the header while already on the search results page, the URL will update but the component state will remain stale, causing the page to display results for the previous query. Consider deriving query directly from searchParams and using a useEffect hook to sync inputValue when the URL changes.

  > **apps/web/src/pages/search/SearchResultsPage.tsx:51**
  >
  > When the user is already on `/search?q=old` and uses the Header's search form to navigate to `/search?q=new`, `useState` initializers at `SearchResultsPage.tsx:50-51` only run on mount — they don't re-run when `searchParams` changes. Since React Router does not remount the component for search-param-only navigations (confirmed by the plain `<Route path="/search">` at `apps/web/src/App.tsx:150`), both `query` and `inputValue` remain stale. The `useSearch(query, typeFilter)` hook continues fetching with the old query, so the page displays old results and the old search term in the input, even though the URL bar shows the new query.

  > **apps/web/src/pages/search/SearchResultsPage.tsx:1**
  >
  > **Sync `query` to URL changes using `useSearchParams` as source of truth.**
  >
  > When `/search?q=` changes without a component remount, the `query` state initialized at lines 50–51 becomes stale. This causes `useSearch(query, typeFilter)` to search using the old value, and `filterByType()` at line 84 perpetuates the stale query in the URL. Derive `query` directly from `searchParams` instead of storing it in state; this automatically keeps it in sync when the URL updates.

- [x] TypeError during loading state — data?.data.map() throws when data is undefined — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M530Xz5 -->
  > **apps/web/src/pages/search/SearchResultsPage.tsx:89**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > This line will throw a TypeError during the loading state because data is undefined. The optional chaining data?.data evaluates to undefined, and calling .map() on it is invalid. You should use optional chaining for the map call as well to prevent the application from crashing while the query is in flight.
  >
  > ```suggestion
  >   const availableTypes = useMemo(() => [...new Set(data?.data?.map((r) => r.type) ?? [])], [data]);
  > ```

- [x] Type filter buttons disappear when a filter is active — @cubic-dev-ai, @devin-ai-integration, @coderabbitai <!-- thread:PRRT_kwDORjaF4M530XkY --> <!-- thread:PRRT_kwDORjaF4M530ZKG --> <!-- thread:PRRT_kwDORjaF4M530idI -->
  > **apps/web/src/pages/search/SearchResultsPage.tsx:89**
  >
  > P1: Once a type filter is active, `availableTypes` is derived from the (now-filtered) results, so only the active type's button remains visible. The user can't switch directly to another type — they must first deselect the current filter. Previously all buttons were always shown.
  >
  > Consider deriving `availableTypes` from an unfiltered query, or falling back to `Object.keys(typeConfig)` when a filter is active.
  >
  > ```suggestion
  >   const availableTypes = useMemo(
  >     () => (typeFilter ? Object.keys(typeConfig) : [...new Set(data?.data.map((r) => r.type))]),
  >     [data, typeFilter],
  >   );
  > ```

  > **apps/web/src/pages/search/SearchResultsPage.tsx:89**
  >
  > `availableTypes` is computed from `data?.data.map(r => r.type)` (line 89), but `data` is the API response which is already filtered by the selected `typeFilter` (passed to `useSearch` at line 54, then to the backend which filters by type). When the user selects e.g. "استثمار" (opportunity), the API returns only opportunity results, so `availableTypes` becomes `['opportunity']` and all other filter buttons disappear.

  > **apps/web/src/pages/search/SearchResultsPage.tsx:89**
  >
  > **Don't derive the filter chips from the already filtered payload.**
  >
  > Once a type is selected, `useSearch(query, typeFilter)` only returns that type, so `availableTypes` collapses to a single button. That turns switching from one type to another into a clear-then-reselect flow. Keep the chip list independent from the filtered response, for example by rendering from `typeConfig` or preserving the unfiltered type list for the current query.

- [x] Listing IDs sent to a page that expects business directory IDs — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M530ZJL -->
  > **apps/web/src/pages/search/SearchResultsPage.tsx:31**
  >
  > Both `listing` and `business` search result types map to `/marketplace/supplier/${result.id}` (lines 29-31). However, `SupplierDetailsPage` calls `useBusiness(id)` which fetches from `businessesAPI.getById(id)` → `/businesses/${id}`. A `listing` result's ID comes from `market.listings`, not `market.business_directories` — these are different tables with different UUIDs. Clicking a listing search result will attempt to load a business that doesn't exist, resulting in an error page. The market search service IS active, so listing results are returned in practice.

- [x] Attraction URLs use id instead of slug — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M530ZIp -->
  > **apps/web/src/pages/search/SearchResultsPage.tsx:38**
  >
  > The `getResultUrl` function maps `attraction` results to `/tourism/attraction/${result.id}`, but `AttractionDetailsPage` extracts a `slug` param and calls `attractionsAPI.getBySlug(slug)`. Every other place in the codebase uses `attraction.slug` for these URLs. Passing a UUID where a slug is expected will cause the API to return a 404. Currently latent since the guide-booking search service is commented out in `search-services.config.ts`, but will break when T31 enables it.

- [x] onModuleDestroy does not await client.quit() calls — @cubic-dev-ai, @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M530Xkg --> <!-- thread:PRRT_kwDORjaF4M530X0D -->
  > **packages/nest-common/src/modules/redis/redis-streams.service.ts:169**
  >
  > P2: The `quit()` calls on duplicated consumer clients are fire-and-forget (`void`), so NestJS won't wait for them during shutdown. Since these clients may be blocked on `xreadgroup` (BLOCK 2000), this can leave dangling connections. Make `onModuleDestroy` async and await the quits, consistent with how `redis.module.ts` handles shutdown.

  > **packages/nest-common/src/modules/redis/redis-streams.service.ts:170**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The onModuleDestroy lifecycle hook should be asynchronous to ensure that all duplicated Redis clients are gracefully closed before the application terminates. Currently, client.quit() is called without awaiting the returned promise, which can lead to connections being abruptly terminated or leaked during shutdown. Please update the method signature to async onModuleDestroy() and await the closing of all clients using Promise.allSettled.

- [x] Duplicated Redis clients lack error handlers — unhandled exceptions possible — @coderabbitai <!-- thread:PRRT_kwDORjaF4M530idJ -->
  > **packages/nest-common/src/modules/redis/redis-streams.service.ts:68**
  >
  > `this.redis.duplicate()` creates a new connection but does NOT copy event handlers. The original client in `redis.module.ts` (lines 36-38) attaches an `'error'` handler to prevent uncaught exceptions. Without attaching the same handler to duplicated clients, connection errors (network issues, auth failures, etc.) will be unhandled.
  >
  > ```diff
  >      // Each consumer loop gets its own connection so blocking xreadgroup doesn't
  >      // starve xgroup CREATE or xack commands on the shared control connection.
  >      const client = this.redis.duplicate();
  > +    client.on('error', (err: Error) => {
  > +      this.logger.error(`[Consumer ${streamKey}] Connection error: ${err.message}`);
  > +    });
  >      this.consumerClients.set(streamKey, client);
  > ```

## Not Worth Fixing

_None found._
