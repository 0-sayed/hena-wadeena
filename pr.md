# PR #30 — feat: market frontend integration

> Generated: 2026-03-22 | Branch: feat/market-frontend-integration | Last updated: 2026-03-22 17:10

## Worth Fixing

- [x] Loading state for stats cards uses wrong hook's isLoading — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M519NIP -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:77**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The loading state for the quick stats cards is tied to the `usePriceIndex` hook (`isLoading`), but the data for these cards primarily comes from the `usePriceSummary` hook. If the summary data loads slower than the index data, the cards will briefly display incorrect `0` values instead of a loading state. It would be better to use a combined loading state or a separate one for the summary data to ensure a correct loading UI.
  >
  > To fix this, you could get the loading state from `usePriceSummary` and use it to control the skeleton display for components that depend on its data:
  > ```typescript
  > const { data: summary, isLoading: isSummaryLoading } = usePriceSummary();
  >
  > // ...
  >
  > {isSummaryLoading ? (
  >   // ... Skeletons
  > ) : (
  >   // ... Stats cards
  > )}
  > ```

- [x] Hardcoded "last updated" timestamp on MarketplacePage — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M519NIR -->
  > **apps/web/src/pages/MarketplacePage.tsx:120**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The "last updated" timestamp is hardcoded. This can be misleading for users. Consider using the `usePriceSummary` hook to get the actual `lastUpdated` timestamp from the API, similar to how it's implemented on the `PricesPage`.

- [x] Main price table has no loading skeleton — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M519NIS -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:259**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The main price table doesn't show a loading state. When `isLoading` is true, the `tbody` is just empty, which can look like there's no data. For a better user experience and consistency with other parts of the application (like the Price Snapshot on the home page), consider adding skeleton rows to the table while data is being fetched.
  >
  > ```
  >                     {isLoading ? (
  >                       Array.from({ length: 8 }).map((_, i) => (
  >                         <tr key={i} className="border-b border-border/50">
  >                           <td colSpan={5} className="py-2 px-6">
  >                             <Skeleton h="h-8" />
  >                           </td>
  >                         </tr>
  >                       ))
  >                     ) : (
  >                       filteredProducts.map((entry, index) => (
  >                         <tr
  >                           key={entry.commodity.id}
  >                           className={`hover:bg-muted/30 ${index !== filteredProducts.length - 1 ? 'border-b border-border/50' : ''}`}
  >                         >
  >                           <td className="py-4 px-6">
  >                             <span className="font-medium text-foreground">
  >                               {entry.commodity.nameAr}
  >                             </span>
  >                           </td>
  >                           <td className="py-4 px-6">
  >                             <Badge variant="outline">{categoryLabel(entry.commodity.category)}</Badge>
  >                           </td>
  >                           <td className="py-4 px-6 text-muted-foreground">
  >                             {districtLabel(entry.region)}
  >                           </td>
  >                           <td className="py-4 px-6">
  >                             <span className="font-semibold text-foreground">
  >                               {formatPrice(entry.latestPrice)}
  >                             </span>
  >                             <span className="text-sm text-muted-foreground mr-1">
  >                               /{unitLabel(entry.commodity.unit)}
  >                             </span>
  >                           </td>
  >                           <td className="py-4 px-6">
  >                             <TrendBadge changePercent={entry.changePercent} size="sm" showSign />
  >                           </td>
  >                         </tr>
  >                       ))
  >                     )}
  > ```

- [x] Missing `جنيه` currency label in PricesPage price column — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M519Nlv -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:252**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-20deabf8922f4d24898077f20dbcc59b_0001", "file_path": "apps/web/src/pages/marketplace/PricesPage.tsx", "start_line": 252, "end_line": 252, "side": "RIGHT"} -->
  >
  > 🟡 **Missing `جنيه` currency label in PricesPage price column**
  >
  > In `PricesPage.tsx`, the price column text was changed from `جنيه/{item.unit}` (old code) to `/{unitLabel(entry.commodity.unit)}` (new code), dropping the `جنيه` (EGP) currency label. This is inconsistent with `MarketplacePage.tsx:171` which correctly shows `جنيه/{unitLabel(entry.commodity.unit)}` and `PriceSnapshot.tsx:86` which also includes `جنيه`. Users viewing the detailed prices page will see prices formatted as e.g. "45 /كجم" instead of "45 جنيه/كجم".
  >
  > ```suggestion
  >                             جنيه/{unitLabel(entry.commodity.unit)}
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/30" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [x] PriceSnapshot heading says "الخارجة" but query fetches all regions — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-QH0 -->
  > **apps/web/src/components/home/PriceSnapshot.tsx:13**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **This widget claims "الخارجة", but the query is global.**
  >
  > `usePriceIndex({ limit: 6 })` does not constrain the region, so the snapshot can show any district under a Kharga-specific heading. Pass `region: 'KHARGA'` here, or make the copy generic.
  >
  > <details>
  > <summary>🔧 Minimal fix</summary>
  >
  > ```diff
  > -  const { data, isLoading } = usePriceIndex({ limit: 6 });
  > +  const { data, isLoading } = usePriceIndex({ region: 'KHARGA', limit: 6 });
  > ```
  > </details>
  >
  >
  > Also applies to: 35-35
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/components/home/PriceSnapshot.tsx` around lines 12 - 13, The
  > price snapshot is querying globally but the UI copy is Kharga-specific; update
  > the call to usePriceIndex to scope results (e.g., change usePriceIndex({ limit:
  > 6 }) to usePriceIndex({ limit: 6, region: 'KHARGA' })) so the data matches the
  > "الخارجة" heading, or alternatively make the heading/copy generic; modify the
  > invocation of usePriceIndex and any related props where used (e.g., the const {
  > data, isLoading } = usePriceIndex(...) line) to keep UI and query consistent.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Query key collision in useBusiness when id is undefined — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-QH2 -->
  > **apps/web/src/hooks/use-businesses.ts:23**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > <details>
  > <summary>❓ Verification inconclusive</summary>
  >
  > Script executed:
  >
  > ```shell
  > # Find the queryKeys definition
  > fd -t f "query" --search-path apps/web/src | head -20
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > ---
  >
  > Repository: 0-sayed/hena-wadeena
  > Exit code: 0
  >
  >
  > stdout:
  > ```
  > apps/web/src/lib/__tests__/query-keys.spec.ts
  > apps/web/src/lib/query-keys.ts
  > ```
  >
  > ---
  >
  > Script executed:
  >
  > ```shell
  > # Search for queryKeys definition more broadly
  > rg "queryKeys\s*=" apps/web/src --type ts --type tsx -A 5 | head -50
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > ---
  >
  > Repository: 0-sayed/hena-wadeena
  > Exit code: 0
  >
  >
  > stderr:
  > ```
  > unrecognized file type: tsx
  > ```
  >
  > ---
  >
  > Script executed:
  >
  > ```shell
  > # Search for market.business definition
  > rg "market.*business" apps/web/src --type ts --type tsx -B 2 -A 2
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > ---
  >
  > Repository: 0-sayed/hena-wadeena
  > Exit code: 2
  >
  >
  > stderr:
  > ```
  > unrecognized file type: tsx
  > ```
  >
  > ---
  >
  > Script executed:
  >
  > ```shell
  > # Check for list query definitions that might collide
  > rg "useBusinesses|useBusiness" apps/web/src --type ts --type tsx -B 3 -A 8
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > ---
  >
  > Repository: 0-sayed/hena-wadeena
  > Exit code: 2
  >
  >
  > stderr:
  > ```
  > unrecognized file type: tsx
  > ```
  >
  > ---
  >
  > Script executed:
  >
  > ```shell
  > cat -n apps/web/src/lib/query-keys.ts
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > ---
  >
  > Repository: 0-sayed/hena-wadeena
  > Exit code: 0
  >
  >
  > stdout:
  > ```
  >      1	export const queryKeys = {
  >      2	  auth: {
  >      3	    me: () => ['auth', 'me'] as const,
  >      4	  },
  >      5	  notifications: {
  >      6	    all: () => ['notifications'] as const,
  >      7	    unreadCount: () => ['notifications', 'unread-count'] as const,
  >      8	  },
  >      9	  tourism: {
  >     10	    attractions: (filters?: Record<string, unknown>) =>
  >     11	      ['tourism', 'attractions', filters] as const,
  >     12	    attraction: (id: string) => ['tourism', 'attractions', id] as const,
  >     13	  },
  >     14	  guides: {
  >     15	    all: (filters?: Record<string, unknown>) => ['guides', filters] as const,
  >     16	    detail: (id: string) => ['guides', id] as const,
  >     17	    packages: (guideId: string) => ['guides', guideId, 'packages'] as const,
  >     18	  },
  >     19	  market: {
  >     20	    priceIndex: (filters?: Record<string, unknown>) => ['market', 'price-index', filters] as const,
  >     21	    priceSummary: () => ['market', 'price-summary'] as const,
  >     22	    businesses: (filters?: Record<string, unknown>) => ['market', 'businesses', filters] as const,
  >     23	    business: (id: string) => ['market', 'businesses', id] as const,
  >     24	  },
  >     25	  investment: {
  >     26	    opportunities: (filters?: Record<string, unknown>) =>
  >     27	      ['investment', 'opportunities', filters] as const,
  >     28	    opportunity: (id: string) => ['investment', 'opportunities', id] as const,
  >     29	  },
  >     30	  map: {
  >     31	    pois: (filters?: Record<string, unknown>) => ['map', 'pois', filters] as const,
  >     32	    carpool: (filters?: Record<string, unknown>) => ['map', 'carpool', filters] as const,
  >     33	  },
  >     34	  search: {
  >     35	    results: (query: string, filters?: Record<string, unknown>) =>
  >     36	      ['search', query, filters] as const,
  >     37	  },
  >     38	  ai: {
  >     39	    sessions: () => ['ai', 'sessions'] as const,
  >     40	    session: (id: string) => ['ai', 'sessions', id] as const,
  >     41	  },
  >     42	};
  > ```
  >
  > ---
  >
  > Script executed:
  >
  > ```shell
  > rg "useBusinesses|useBusiness" apps/web/src -B 2 -A 10
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > ---
  >
  > Repository: 0-sayed/hena-wadeena
  > Exit code: 0
  >
  >
  > stdout:
  > ```
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-import { Badge } from '@/components/ui/badge';
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx:import { useBusiness } from '@/hooks/use-businesses';
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-import { districtLabel, unitLabel } from '@/lib/format';
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-import { Skeleton } from '@/components/motion/Skeleton';
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-const SupplierDetailsPage = () => {
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-  const navigate = useNavigate();
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-  const { id } = useParams();
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx:  const { data: business, isLoading, isError } = useBusiness(id);
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-  if (isLoading) {
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-    return (
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-      <Layout>
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-        <section className="py-8 md:py-12">
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-          <div className="container px-4">
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-            <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-6">
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-              <ArrowRight className="h-4 w-4 ml-2" />
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-              العودة للبورصة
  > apps/web/src/pages/marketplace/SupplierDetailsPage.tsx-            </Button>
  > --
  > apps/web/src/pages/MarketplacePage.tsx-import { TrendBadge } from '@/components/market/TrendBadge';
  > apps/web/src/pages/MarketplacePage.tsx-import { usePriceIndex } from '@/hooks/use-price-index';
  > apps/web/src/pages/MarketplacePage.tsx:import { useBusinesses } from '@/hooks/use-businesses';
  > apps/web/src/pages/MarketplacePage.tsx-import { formatPrice, districtLabel, categoryLabel, unitLabel, DISTRICTS } from '@/lib/format';
  > apps/web/src/pages/MarketplacePage.tsx-
  > apps/web/src/pages/MarketplacePage.tsx-const MarketplacePage = () => {
  > apps/web/src/pages/MarketplacePage.tsx-  const navigate = useNavigate();
  > apps/web/src/pages/MarketplacePage.tsx-  const [selectedCity, setSelectedCity] = useState('kharga');
  > apps/web/src/pages/MarketplacePage.tsx-  const [searchQuery, setSearchQuery] = useState('');
  > apps/web/src/pages/MarketplacePage.tsx-
  > apps/web/src/pages/MarketplacePage.tsx-  const { data: pricesData, isLoading: pricesLoading } = usePriceIndex({
  > apps/web/src/pages/MarketplacePage.tsx-    region: selectedCity,
  > apps/web/src/pages/MarketplacePage.tsx-  });
  > apps/web/src/pages/MarketplacePage.tsx:  const { data: suppliersData, isLoading: suppliersLoading } = useBusinesses();
  > apps/web/src/pages/MarketplacePage.tsx-
  > apps/web/src/pages/MarketplacePage.tsx-  const priceEntries = pricesData?.data ?? [];
  > apps/web/src/pages/MarketplacePage.tsx-  const businesses = suppliersData?.data ?? [];
  > apps/web/src/pages/MarketplacePage.tsx-
  > apps/web/src/pages/MarketplacePage.tsx-  const filteredProducts = priceEntries.filter(
  > apps/web/src/pages/MarketplacePage.tsx-    (e) =>
  > apps/web/src/pages/MarketplacePage.tsx-      e.commodity.nameAr.includes(searchQuery) ||
  > apps/web/src/pages/MarketplacePage.tsx-      categoryLabel(e.commodity.category).includes(searchQuery),
  > apps/web/src/pages/MarketplacePage.tsx-  );
  > apps/web/src/pages/MarketplacePage.tsx-
  > --
  > apps/web/src/hooks/use-businesses.ts-import { businessesAPI } from '@/services/api';
  > apps/web/src/hooks/use-businesses.ts-
  > apps/web/src/hooks/use-businesses.ts:export function useBusinesses(filters?: {
  > apps/web/src/hooks/use-businesses.ts-  category?: string;
  > apps/web/src/hooks/use-businesses.ts-  district?: string;
  > apps/web/src/hooks/use-businesses.ts-  q?: string;
  > apps/web/src/hooks/use-businesses.ts-  limit?: number;
  > apps/web/src/hooks/use-businesses.ts-  offset?: number;
  > apps/web/src/hooks/use-businesses.ts-}) {
  > apps/web/src/hooks/use-businesses.ts-  return useQuery({
  > apps/web/src/hooks/use-businesses.ts-    queryKey: queryKeys.market.businesses(filters),
  > apps/web/src/hooks/use-businesses.ts-    queryFn: () => businessesAPI.getAll(filters),
  > apps/web/src/hooks/use-businesses.ts-  });
  > apps/web/src/hooks/use-businesses.ts-}
  > apps/web/src/hooks/use-businesses.ts-
  > apps/web/src/hooks/use-businesses.ts:export function useBusiness(id: string | undefined) {
  > apps/web/src/hooks/use-businesses.ts-  return useQuery({
  > apps/web/src/hooks/use-businesses.ts-    queryKey: queryKeys.market.business(id!),
  > apps/web/src/hooks/use-businesses.ts-    queryFn: () => businessesAPI.getById(id!),
  > apps/web/src/hooks/use-businesses.ts-    enabled: !!id,
  > apps/web/src/hooks/use-businesses.ts-  });
  > apps/web/src/hooks/use-businesses.ts-}
  > ```
  >
  > ---
  >
  >
  >
  > </details>
  >
  > **Avoid reusing the list key when `id` is missing.**
  >
  > When `id` is `undefined`, the query key `queryKeys.market.business(undefined)` becomes `['market', 'businesses', undefined]`—identical to `useBusinesses()` called without filters. Even though `enabled: !!id` prevents the fetch, React Query still subscribes to that cache key and will return any cached list data as if it were a detail response, creating a type-shape mismatch.
  >
  > <details>
  > <summary>🔧 One safe pattern</summary>
  >
  > ```diff
  >  export function useBusiness(id: string | undefined) {
  >    return useQuery({
  > -    queryKey: queryKeys.market.business(id!),
  > -    queryFn: () => businessesAPI.getById(id!),
  > +    queryKey: id ? queryKeys.market.business(id) : (['market', 'business', 'pending'] as const),
  > +    queryFn: () => {
  > +      if (!id) throw new Error('Business id is required');
  > +      return businessesAPI.getById(id);
  > +    },
  >      enabled: !!id,
  >    });
  >  }
  > ```
  > </details>
  >
  > <!-- suggestion_start -->
  >
  > <details>
  > <summary>📝 Committable suggestion</summary>
  >
  > > ‼️ **IMPORTANT**
  > > Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.
  >
  > ```suggestion
  > export function useBusiness(id: string | undefined) {
  >   return useQuery({
  >     queryKey: id ? queryKeys.market.business(id) : (['market', 'business', 'pending'] as const),
  >     queryFn: () => {
  >       if (!id) throw new Error('Business id is required');
  >       return businessesAPI.getById(id);
  >     },
  >     enabled: !!id,
  >   });
  > }
  > ```
  >
  > </details>
  >
  > <!-- suggestion_end -->
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/hooks/use-businesses.ts` around lines 18 - 23, The queryKey
  > currently reuses the list key when id is undefined
  > (queryKeys.market.business(undefined)), causing list cache to be treated as a
  > detail result; update useBusiness to produce a distinct key for the detail route
  > (e.g., include a "detail" segment) and only use the real id when present: in
  > useBusiness, change queryKey to something like id ?
  > queryKeys.market.business(id) : ['market','business','detail', id] (or always
  > use ['market','business','detail', id]) so the detail cache key never collides
  > with the list key, keep enabled: !!id and keep queryFn: () =>
  > businessesAPI.getById(id!) as before.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Null `changePercent` renders as "null%" in gainers badge — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-QH_ -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:136**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Potential null display in badge text.**
  >
  > `mover.changePercent` is typed as `number | null`. If null, `+{mover.changePercent}%` renders as `+null%`. Consider using the null-coalesce pattern or reusing `TrendBadge`:
  >
  >
  >
  > <details>
  > <summary>Proposed fix</summary>
  >
  > ```diff
  > -                      <Badge className="bg-primary/10 text-primary">+{mover.changePercent}%</Badge>
  > +                      <Badge className="bg-primary/10 text-primary">+{mover.changePercent ?? 0}%</Badge>
  > ```
  > </details>
  >
  > <!-- suggestion_start -->
  >
  > <details>
  > <summary>📝 Committable suggestion</summary>
  >
  > > ‼️ **IMPORTANT**
  > > Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.
  >
  > ```suggestion
  >                   {gainers.map((mover) => (
  >                     <div
  >                       key={mover.commodity.id}
  >                       className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
  >                     >
  >                       <span className="font-medium">{mover.commodity.nameAr}</span>
  >                       <Badge className="bg-primary/10 text-primary">+{mover.changePercent ?? 0}%</Badge>
  >                     </div>
  > ```
  >
  > </details>
  >
  > <!-- suggestion_end -->
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/marketplace/PricesPage.tsx` around lines 129 - 136, The
  > Badge currently renders +{mover.changePercent}% but mover.changePercent is
  > number | null; update the rendering inside the gainers.map item so Badge
  > displays a safe value: use a null-coalescing or conditional check on
  > mover.changePercent (e.g., show `+${mover.changePercent}%` only when
  > mover.changePercent != null, otherwise show a placeholder like "—" or "0%"), or
  > replace Badge with the existing TrendBadge component which already handles
  > nulls; adjust the text formatting to include the plus sign only when a numeric
  > value exists (reference symbols: gainers, mover, changePercent, Badge,
  > TrendBadge).
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Same null `changePercent` issue in losers badge — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-QIA -->
  > **apps/web/src/pages/marketplace/PricesPage.tsx:161**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Same null-safety concern for losers.**
  >
  > Same issue as gainers: `{mover.changePercent}%` could render `null%`.
  >
  >
  >
  > <details>
  > <summary>Proposed fix</summary>
  >
  > ```diff
  > -                      <Badge className="bg-destructive/10 text-destructive">
  > -                        {mover.changePercent}%
  > -                      </Badge>
  > +                      <Badge className="bg-destructive/10 text-destructive">
  > +                        {mover.changePercent ?? 0}%
  > +                      </Badge>
  > ```
  > </details>
  >
  > <!-- suggestion_start -->
  >
  > <details>
  > <summary>📝 Committable suggestion</summary>
  >
  > > ‼️ **IMPORTANT**
  > > Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.
  >
  > ```suggestion
  >                   {losers.map((mover) => (
  >                     <div
  >                       key={mover.commodity.id}
  >                       className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
  >                     >
  >                       <span className="font-medium">{mover.commodity.nameAr}</span>
  >                       <Badge className="bg-destructive/10 text-destructive">
  >                         {mover.changePercent ?? 0}%
  >                       </Badge>
  >                     </div>
  >                   ))}\n```
  >
  > </details>
  >
  > <!-- suggestion_end -->
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/marketplace/PricesPage.tsx` around lines 151 - 161, The
  > losers list rendering can output "null%" when mover.changePercent is
  > null/undefined; update the PricesPage rendering for the losers map to guard and
  > format the value (use mover.changePercent ?? fallback or optional chaining and a
  > formatted number) and render a reasonable fallback like "-" or "0%" instead of
  > "null%"; locate the losers map block and change the Badge content to use
  > mover.changePercent with nullish coalescing and formatting (e.g.,
  > (mover.changePercent ?? 0) or show "-" when null) so the UI never displays
  > "null%".
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

## Not Worth Fixing

- [ ] ~~District enum casing mismatch in format tests — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-QH9 -->
  - _Reason: The `NvDistrict` enum values are lowercase (`kharga`, `dakhla`). The backend returns these lowercase values. The tests are already correct — CodeRabbit assumed uppercase enum names, but the actual enum values are lowercase._
  > **apps/web/src/lib/__tests__/format.spec.ts:35**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Use the backend enum casing in these district cases.**
  >
  > The market APIs return district values like `KHARGA` and `DAKHLA`. Keeping these fixtures lowercase means the suite never exercises the real frontend contract and can miss a regression in the production label path.

- [ ] ~~Type `location` as `unknown | null` instead of `unknown` — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M519NIU -->
  - _Reason: In TypeScript, `unknown | null` is equivalent to `unknown` — the union adds no type safety. The current `unknown` typing already encompasses null values._
  > **apps/web/src/services/api.ts:238**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The `location` property on `BusinessEntry` is typed as `unknown`. However, it's possible for this field to be `null` from the backend, especially if it's an optional field. For better type safety, it would be best to type it as `unknown | null`.
  >
  > ```suggestion
  >   location: unknown | null;
  > ```

- [ ] ~~Expose `price_type` filter on usePriceIndex hook — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-QH7 -->
  - _Reason: Out of scope — the UI doesn't currently need price_type filtering, and the hook's filter object is passed through to the API as-is. Can be added when a consumer actually needs it._
  > **apps/web/src/hooks/use-price-index.ts:14**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Expose `price_type` on this hook.**
  >
  > The backend index is keyed by `(commodity, region, price_type)`, and `priceIndexAPI.getIndex()` already supports that filter. Dropping it here forces every consumer into mixed price series while the UI only renders a single commodity/price row.
  >
  > <details>
  > <summary>🔧 Minimal fix</summary>
  >
  > ```diff
  >  export function usePriceIndex(filters?: {
  >    category?: string;
  >    region?: string;
  > +  price_type?: string;
  >    limit?: number;
  >    offset?: number;
  >  }) {
  > ```
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/hooks/use-price-index.ts` around lines 5 - 14, The hook
  > usePriceIndex currently types and passes filters without price_type, causing
  > consumers to receive mixed price series; update the filters shape in
  > usePriceIndex to include price_type?: string and ensure that same filters object
  > (including price_type) is passed to both queryKeys.market.priceIndex(...) and
  > priceIndexAPI.getIndex(...) so the cache key and API call respect the price_type
  > filter (referencing usePriceIndex, queryKeys.market.priceIndex, and
  > priceIndexAPI.getIndex).
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->
