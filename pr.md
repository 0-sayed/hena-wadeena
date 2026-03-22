# PR #29 — feat: tourism guides frontend

> Generated: 2026-03-22 | Branch: feat/tourism-guides-frontend | Last updated: 2026-03-22 08:00

## Worth Fixing

- [x] `maxPages: 5` causes loaded items to silently disappear from "Load More" lists — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M519OBV -->
  > **apps/web/src/hooks/use-attractions.ts:11**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-ad5bdbb177b0477a86e97d193fccbe65_0001", "file_path": "apps/web/src/hooks/use-attractions.ts", "start_line": 11, "end_line": 11, "side": "RIGHT"} -->
  >
  > 🔴 **`maxPages: 5` causes previously loaded items to silently disappear from "Load More" lists**
  >
  > All four `useInfiniteQuery` hooks set `maxPages: 5`, which evicts the oldest page from cache when page 6 is fetched. Since the rendered list is built via `data.pages.flatMap(p => p.data)`, items from evicted pages vanish from the visible list when the user clicks "Load More" a 6th time. This is the wrong setting for an append-only "Load More" pattern — `maxPages` is designed for bidirectional infinite scroll where old pages at either end can be discarded. The same issue exists in all four hooks: `use-attractions.ts:11`, `use-guides.ts:11`, `use-guides.ts:29`, and `use-packages.ts:11`.
  >
  > <details>
  > <summary>Prompt for agents</summary>
  >
  > ```
  > Remove `maxPages: 5` from all four infinite query hooks since the app uses an append-only "Load More" pattern where all loaded pages must remain visible. The affected files and lines are:
  >
  > 1. apps/web/src/hooks/use-attractions.ts line 11: remove `maxPages: 5,`
  > 2. apps/web/src/hooks/use-guides.ts line 11: remove `maxPages: 5,` (in useGuides)
  > 3. apps/web/src/hooks/use-guides.ts line 29: remove `maxPages: 5,` (in useGuidePackages)
  > 4. apps/web/src/hooks/use-packages.ts line 11: remove `maxPages: 5,`
  >
  > The maxPages option is only appropriate for bidirectional infinite scroll (with both getNextPageParam and getPreviousPageParam) where old pages at either end can be reclaimed. For a forward-only Load More list, all loaded pages must be retained in the cache.
  > ```
  >
  > </details>

- [x] Falsy check on `ratingAvg` renders `0` as visible text in the DOM — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M519OB6 -->
  > **apps/web/src/pages/tourism/AttractionDetailsPage.tsx:81**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-ad5bdbb177b0477a86e97d193fccbe65_0002", "file_path": "apps/web/src/pages/tourism/AttractionDetailsPage.tsx", "start_line": 81, "end_line": 81, "side": "RIGHT"} -->
  >
  > 🟡 **Falsy check on `ratingAvg` (number|null) would render `0` as visible text in the DOM**
  >
  > The pattern `{attraction.ratingAvg && (<div>...</div>)}` is a React rendering footgun: when `ratingAvg` is `0`, the `&&` short-circuits to `0`, and React renders the number `0` as visible text in the DOM instead of the intended JSX block (or nothing). The correct check is `{attraction.ratingAvg != null && (...)}`. While a `0` average is unlikely with a 1-5 rating scale, the type is `number | null` and the code handles it incorrectly. The same issue exists at `apps/web/src/pages/tourism/AttractionDetailsPage.tsx:245` for nearby attractions and `apps/web/src/pages/tourism/PackagesPage.tsx:140` for guide ratings.
  >
  > ```suggestion
  > {attraction.ratingAvg != null && (
  > ```

- [x] Synthetic event bug in debounced search handler (GuidesPage) — @coderabbitai <!-- thread:PRRT_kwDORjaF4M519OtE -->
  > **apps/web/src/pages/guides/GuidesPage.tsx:44**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Same synthetic event bug in debounced search handler.**
  >
  > Same issue as flagged in `AttractionsPage.tsx` - extract `e.target.value` synchronously before passing to the debounced function.
  >
  >
  >
  > <details>
  > <summary>🐛 Proposed fix</summary>
  >
  > ```diff
  > - const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  > -   const search = e.target.value || undefined;
  > -   setFilters((prev) => ({ ...prev, search }));
  > - });
  > + const debouncedSetSearch = useDebouncedCallback((value: string) => {
  > +   setFilters((prev) => ({ ...prev, search: value || undefined }));
  > + });
  > +
  > + const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  > +   debouncedSetSearch(e.target.value);
  > + };
  > ```
  > </details>

- [x] Synthetic event bug in debounced search handler (PackagesPage) — @coderabbitai <!-- thread:PRRT_kwDORjaF4M519OtK -->
  > **apps/web/src/pages/tourism/PackagesPage.tsx:36**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Same synthetic event bug in debounced search handler.**
  >
  > Same pattern as other pages - extract `e.target.value` synchronously.
  >
  >
  >
  > <details>
  > <summary>🐛 Proposed fix</summary>
  >
  > ```diff
  > - const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  > -   const search = e.target.value || undefined;
  > -   setFilters((prev) => ({ ...prev, search }));
  > - });
  > + const debouncedSetSearch = useDebouncedCallback((value: string) => {
  > +   setFilters((prev) => ({ ...prev, search: value || undefined }));
  > + });
  > +
  > + const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  > +   debouncedSetSearch(e.target.value);
  > + };
  > ```
  > </details>


- [x] Packages query collapsed into empty state hides loading/error — @coderabbitai <!-- thread:PRRT_kwDORjaF4M519OtB -->
  > **apps/web/src/pages/guides/GuideProfilePage.tsx:32**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Don't collapse the packages query into the empty state.**
  >
  > `packagesData?.pages... ?? []` makes the first render and any package-query failure look like a real empty result, so users can see `لا توجد باقات...` before the first successful response or after an error with no retry path. Keep initial loading/error for `useGuidePackages` separate and only show the empty copy after a successful fetch with zero items.
  >
  >
  >
  > Also applies to: 126-127

- [x] Nearby attraction cards not accessible as links — @coderabbitai <!-- thread:PRRT_kwDORjaF4M519OtJ -->
  > **apps/web/src/pages/tourism/AttractionDetailsPage.tsx:229**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Make the nearby attraction cards real links.**
  >
  > This navigation is attached to a non-focusable `Card`, so keyboard users cannot open nearby attractions and standard link behavior like open-in-new-tab is lost. Render the card as a `Link` instead of a clickable container.

- [x] "Back" button uses `navigate(-1)` — can navigate off-site — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M519NcL -->
  > **apps/web/src/pages/tourism/AttractionDetailsPage.tsx:67**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The "Back" button currently uses `navigate(-1)`. This can lead to a poor user experience if the user navigates to this page directly (e.g., from a bookmark or an external link), as it would take them away from the site. It would be more robust to navigate to a deterministic URL, such as the main attractions list. This was the behavior in the previous version of the code.
  >
  > ```suggestion
  >           <Button
  >             variant="ghost"
  >             className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm"
  >             onClick={() => void navigate('/tourism/attractions')}
  >           >
  >             <ArrowRight className="h-4 w-4 ml-2" />
  >             رجوع
  >           </Button>
  > ```

## Not Worth Fixing

- [ ] ~~Generic constraint `never[]` should be `any[]` in `useDebouncedCallback` — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M519NcJ -->
  - _Reason: `never[]` is correct TypeScript — due to contravariance, `T extends (...args: never[]) => void` accepts any function signature. Changing to `any[]` triggers ESLint `no-explicit-any` warning._
  > **apps/web/src/hooks/use-debounce.ts:7**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The generic constraint `T extends (...args: never[]) => void` for the `useDebouncedCallback` hook seems incorrect. The type `never[]` implies a function with zero arguments, but this hook is used with callbacks that do accept arguments (e.g., a `ChangeEvent`). This could lead to unexpected type issues. A more conventional and correct constraint would be `T extends (...args: any[]) => void`.

- [ ] ~~Broken route: AccommodationDetailsPage navigates to removed path — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M519OtA -->
  - _Reason: AccommodationDetailsPage itself is not imported or routed in App.tsx — the page is unreachable dead code. The broken navigation within it can't be hit by users._
  > **apps/web/src/App.tsx:140**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Route removal introduced a broken tourism navigation path.**
  >
  > `AccommodationDetailsPage` still navigates to `/tourism/accommodation-inquiry/${id}` but this router no longer defines that path.

- [ ] ~~Duplicated T11 entries in BOARD.md dependency status — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M519OtM -->
  - _Reason: This is a planning/tracking doc, not code. Minor inconsistency in checkbox states that doesn't affect the application._
  > **docs/roadmap/BOARD.md:60**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Dependency status for F03 is ambiguous due duplicated `T11` entries.**
  >
  > Line 60 marks **F03** complete, but this board contains conflicting `T11` states (`[x]` and `[ ]`), so dependency completion is unclear and planning can drift.

- [ ] ~~Plan file uses floating-point money math in formatEGP example — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M519OtN -->
  - _Reason: This is in the plan document, not shipped code. The actual implementation should follow the project's integer piasters convention regardless of what the plan shows._
  > **docs/superpowers/plans/2026-03-21-f03-tourism-guides.md:65**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Don't bake floating-point money math into the plan.**
  >
  > If Task 1 is implemented as written, `formatEGP` will convert piasters through decimal arithmetic and `toFixed`, which teaches the exact money-handling pattern the repo tries to avoid.

- [ ] ~~Spec documents useQuery but code uses useInfiniteQuery — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M519OtO -->
  - _Reason: The spec is outdated relative to the implementation, but the actual code is correct. Updating spec docs is low priority and doesn't affect the application._
  > **docs/superpowers/specs/2026-03-21-f03-tourism-guides-design.md:340**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Update the guide-packages section to match the infinite-query implementation.**
  >
  > The spec documents `useGuidePackages` as a `useQuery` hook with `page`/`limit` parameters and `data.hasMore`, but the actual hook at `apps/web/src/hooks/use-guides.ts:23-32` uses `useInfiniteQuery` with `pageParam` and `getNextPageParam`.
