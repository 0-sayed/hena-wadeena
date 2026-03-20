# PR #24 — feat(market): business directory & commodity prices

> Generated: 2026-03-20 | Branch: feat/market-business-directory-commodity-prices | Last updated: 2026-03-20 09:00

## Worth Fixing

- [x] Missing foreign keys on business_commodities and commodity_prices tables — @gemini-code-assist, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qRJL --> <!-- thread:PRRT_kwDORjaF4M51qRJP --> <!-- thread:PRRT_kwDORjaF4M51qWdh --> <!-- thread:PRRT_kwDORjaF4M51qWdo --> <!-- thread:PRRT_kwDORjaF4M51qWeQ --> <!-- thread:PRRT_kwDORjaF4M51qWeV -->
  > **services/market/drizzle/20260319225240_lonely_kingpin.sql:9**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `business_commodities` table is missing foreign key constraints on `business_id` and `commodity_id`. Without these constraints, you risk creating orphaned records if a business or commodity is deleted, which can lead to data integrity issues. It's highly recommended to enforce these relationships at the database level.
  >
  > You should add foreign key constraints referencing `market.business_directories(id)` and `market.commodities(id)` respectively.

  > **services/market/drizzle/20260319225240_lonely_kingpin.sql:37**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `commodity_prices` table is missing a foreign key constraint on `commodity_id` referencing the `commodities` table. This is crucial for ensuring that every price entry is associated with a valid commodity.
  >
  > Additionally, the `recorded_by` column appears to reference a user, and would also benefit from a foreign key constraint if a users table is available.

  > **services/market/drizzle/20260319225240_lonely_kingpin.sql:9**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Add foreign keys for the new reference tables.**
  >
  > `business_commodities` and `commodity_prices` are created without FKs back to `business_directories`/`commodities`, so the DB can store orphaned links and prices with invalid commodity IDs. Please add the `references(...)` clauses in the Drizzle schema and regenerate this migration.
  >
  >
  > Based on learnings: Generated Drizzle migrations are machine-owned — do NOT manually edit them. Fix schema `.ts` files and regenerate instead.
  >
  >
  > Also applies to: 24-37

  > **services/market/src/db/schema/business-commodities.ts:11**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Add foreign keys to protect join-table integrity.**
  >
  > `businessId` and `commodityId` lack referential constraints—orphan associations can be inserted. Other relationship tables in the same schema (reviews → listings, investment_applications → investmentOpportunities) define foreign keys, confirming this is inconsistent with the codebase pattern.

  > **services/market/src/db/schema/commodity-prices.ts:13**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Add FK constraint on `commodity_id` to prevent orphan price records.**
  >
  > The `commodityId` field lacks both database-level and application-level validation. The service inserts price records without checking if the commodity exists—it only queries for the name *after* insert. If a non-existent UUID is provided, the record is persisted anyway.

- [x] Admin update/delete advertised but blocked by assertOwnership — @chatgpt-codex-connector, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qOhd --> <!-- thread:PRRT_kwDORjaF4M51qWdt -->
  > **services/market/src/business-directory/business-directory.service.ts:163**
  >
  > **<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Allow admins through the business ownership gate**
  >
  > The controller explicitly grants `UserRole.ADMIN` on `PATCH /businesses/:id` and `DELETE /businesses/:id`, but `update()` and `remove()` both call `assertOwnership()` first, and that helper rejects every non-owner. In practice an admin token can never edit or delete someone else's business, so these routes return 403 for the very role the controller advertises.
  >
  > Useful? React with 👍 / 👎.

  > **services/market/src/business-directory/business-directory.controller.ts:63**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Admin update/delete is advertised but unreachable.**
  >
  > These handlers allow `UserRole.ADMIN`, but the service methods they call immediately enforce `assertOwnership()` against `user.sub`. Any non-owner admin will still get `403`, so the controller contract is currently false.

- [x] updatePrice missing uniqueness conflict (23505) handling — returns 500 instead of 409 — @chatgpt-codex-connector <!-- thread:PRRT_kwDORjaF4M51qOhi -->
  > **services/market/src/commodity-prices/commodity-prices.service.ts:330**
  >
  > **<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Translate price-update uniqueness conflicts to 409**
  >
  > The new `uq_commodity_price_daily` index can also be violated during edits, but `updatePrice()` does not catch `23505` the way `createPrice()` and `batchCreatePrices()` do. If an admin changes `region`, `priceType`, or `recordedAt` so the row collides with another live entry for the same commodity/day, this path now bubbles a raw database error as a 500 instead of the expected 409 conflict.
  >
  > Useful? React with 👍 / 👎.

- [x] Commodity detail cache not invalidated by price writes — stale latestPricesByRegion — @chatgpt-codex-connector, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qOhm --> <!-- thread:PRRT_kwDORjaF4M51qWeG -->
  > **services/market/src/commodity-prices/commodity-prices.service.ts:253**
  >
  > **<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Evict commodity detail cache after price writes**
  >
  > `findCommodityById()` caches `latestPricesByRegion` for 30 minutes, but the price mutation paths only call `invalidatePriceCache()`. Once `/commodities/:id` has been cached, creating, updating, or deleting a price for that commodity leaves the detail endpoint serving stale latest prices until TTL expiry because `mkt:commodity:${id}` is never invalidated.
  >
  > Useful? React with 👍 / 👎.

  > **services/market/src/commodity-prices/commodity-prices.service.ts:211**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **`findCommodityById()` cache is never invalidated by price writes.**
  >
  > `mkt:commodity:${id}` caches `latestPricesByRegion`, but the shared price-write invalidation only clears index and summary keys. After a create, update, or delete, the commodity detail endpoint can keep serving stale latest-price data until its 30-minute TTL expires.
  >
  >
  >
  > Also applies to: 599-606

- [x] Price-index caches not evicted when commodity metadata changes — @chatgpt-codex-connector, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qOhq --> <!-- thread:PRRT_kwDORjaF4M51qWeE -->
  > **services/market/src/commodity-prices/commodity-prices.service.ts:155**
  >
  > **<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Evict price-index caches when commodity metadata changes**
  >
  > `getPriceIndex()` and `getPriceSummary()` cache commodity name/category/active-state data for an hour, but `updateCommodity()` and `deactivateCommodity()` only clear the per-commodity detail key. If a commodity is renamed, recategorized, or deactivated after those dashboards are cached, the public price index and summary keep the old metadata—or keep showing a deactivated commodity—until another price write happens or the TTL expires.
  >
  > Useful? React with 👍 / 👎.

  > **services/market/src/commodity-prices/commodity-prices.service.ts:169**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Commodity writes don't invalidate the public price caches.**
  >
  > `/price-index` and `/price-index/summary` cache commodity-derived fields like `name*`, `category`, `unit`, and `isActive`, but `createCommodity()` does not clear those keys and update/deactivate only delete `mkt:commodity:${id}`. Renames and deactivations can stay visible on the public price endpoints for up to an hour.
  >
  >
  >
  > Also applies to: 608-612

- [x] GET /businesses/:id exposes unverified/pending/rejected businesses — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qWdq -->
  > **services/market/src/business-directory/business-directory.controller.ts:45**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **`GET /businesses/:id` bypasses the verification gate.**
  >
  > `findAll()` only exposes rows that are fit for the public directory, but this public detail route delegates to a lookup that only filters `deletedAt`. Pending, rejected, or suspended businesses remain externally readable by ID before they are approved.

- [x] Commodity IDs not validated before inserting business_commodities links — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qWdy -->
  > **services/market/src/business-directory/business-directory.service.ts:153**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Commodity links are written without validating the IDs.**
  >
  > `dto.commodityIds` goes straight into `business_commodities` on create and update. A stale or unknown ID either creates a dangling association or bubbles a raw database failure back to the client, depending on the constraint setup. This should fail as a controlled 4xx before the write transaction starts.
  >
  >
  >
  > Also applies to: 201-208

- [x] Website field accepts javascript: URLs — stored XSS vector — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qWd5 -->
  > **services/market/src/business-directory/dto/create-business.dto.ts:19**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Restrict `website` to web schemes.**
  >
  > This still accepts syntactically valid URLs like `javascript:alert(1)`. If the directory UI later renders that into an `href`, it becomes a stored XSS vector. Limit this field to `http`/`https`.
  >
  >
  > <details>
  > <summary>🔒 Suggested fix</summary>
  >
  > ```diff
  > -  website: z.url().optional(),
  > +  website: z
  > +    .string()
  > +    .url()
  > +    .refine((value) => /^https?:\/\//i.test(value), {
  > +      message: 'website must use http or https',
  > +    })
  > +    .optional(),
  > ```
  > </details>

- [x] Unknown commodityId on price create returns 500 instead of 4xx — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qWeI -->
  > **services/market/src/commodity-prices/commodity-prices.service.ts:288**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Unknown `commodityId` currently looks like a server error.**
  >
  > `createPrice()` and `batchCreatePrices()` only translate duplicate-row failures. If a client submits a missing commodity, the insert falls through as a raw database error instead of a controlled 4xx validation/business error.

- [x] Invalid UUID :id params not rejected at controller boundary — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qWeC -->
  > **services/market/src/commodity-prices/commodity-prices.controller.ts:59**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Reject invalid `:id` params at the controller boundary.**
  >
  > These handlers all target UUID-backed records, but the params are plain strings. A bad id will make it to the DB layer and likely come back as a 500 instead of a clean 400. Add UUID validation on every `:id` param here before calling the service.
  >
  >
  >
  > Also applies to: 84-93

- [x] Test helper limit() mock is terminal instead of chainable — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qWeg -->
  > **services/market/src/shared/test-helpers.ts:30**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Make `limit()` chainable to match real Drizzle behavior.**
  >
  > Line 39 incorrectly makes `limit()` terminal. Production code chains `.limit().offset()` (seen in listings.service.ts at lines 196–197, 217–218, 250–251), and the mock should reflect that behavior. Currently, any test attempting to call `.limit(...).offset(...)` will fail because `limit()` resolves to `[]` instead of returning the chain.
  >
  > Update the documentation (line 30) and implementation (line 39):
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > - * Terminal by default (resolve to `[]`): limit, returning, execute.
  > + * Terminal by default (resolve to `[]`): returning, execute.
  > ```
  >
  > ```diff
  > -  chain.limit = vi.fn().mockResolvedValue([]);
  > +  chain.limit = vi.fn().mockReturnValue(chain);
  > ```
  > </details>

- [x] Security Audit failing — CI
  - [x] High severity: Prototype Pollution via parse() in flatted <=3.4.1 (transitive dep via eslint > file-entry-cache > flat-cache > flatted). 8 total vulnerabilities found (1 low, 6 moderate, 1 high). `pnpm audit --audit-level=high` exits with code 1.

## Not Worth Fixing

- [ ] ~~Verification workflow fields allow inconsistent DB states — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51qWdl -->
  - _Reason: Application code already enforces the verification workflow (service layer validates status transitions). Adding CHECK constraints is a separate hardening concern, not a bug introduced by this PR._
  > **services/market/drizzle/meta/20260319225240_snapshot.json:149**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Verification workflow fields allow inconsistent states.**
  >
  > `verification_status`, `verified_by`, `verified_at`, and `rejection_reason` have no DB check constraints tying them together. This permits invalid combinations (e.g., `verified` with null verifier/timestamp, or `rejected` without reason). Add status-dependent check constraints to enforce workflow integrity.
  >
  >
  >
  >
  > Also applies to: 252-252

- [ ] ~~Suspending a business should clear old rejection reason — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51qWd1 -->
  - _Reason: Edge case — a business would need to go pending→rejected→suspended for stale data to appear, and the rejection reason is not exposed publicly. Low impact._
  > **services/market/src/business-directory/business-directory.service.ts:388**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Suspending a business should clear any old rejection reason.**
  >
  > The `verified` branch resets `rejectionReason`, but the `suspended` branch leaves whatever was stored before. A previously rejected business can therefore come back as `suspended` with an unrelated rejection message.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >      } else {
  >        // suspended
  >        updates.verifiedBy = null;
  >        updates.verifiedAt = null;
  > +      updates.rejectionReason = null;
  >      }
  > ```
  > </details>

- [ ] ~~Reject whitespace-only rejection reasons — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51qWd7 -->
  - _Reason: Trivial edge case. Whitespace-only rejection reasons are unlikely in practice and the field is admin-only._
  > **services/market/src/business-directory/dto/verify-business.dto.ts:10**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Reject whitespace-only rejection reasons.**
  >
  > Current check allows `"   "` as a valid reason when `status` is `rejected`. Trim before validating presence.
  >
  >
  > <details>
  > <summary>🛠️ Suggested fix</summary>
  >
  > ```diff
  > -    if (data.status === 'rejected' && !data.rejectionReason) {
  > +    if (data.status === 'rejected' && !data.rejectionReason?.trim()) {
  > ```
  > </details>

- [ ] ~~Clamp price field to PostgreSQL integer max — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51qWeK -->
  - _Reason: Values >2.1B piasters (~21M EGP) are unrealistic for commodity prices. The DB will reject overflow anyway — this is defense-in-depth, not a bug._
  > **services/market/src/commodity-prices/dto/create-commodity-price.dto.ts:7**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Clamp `price` to the column range.**
  >
  > The backing column is PostgreSQL `integer`, so values above `2_147_483_647` pass validation here and then fail at insert time instead of returning a 400.
  >
  >
  > <details>
  > <summary>🐛 Suggested fix</summary>
  >
  > ```diff
  > -  price: z.number().int().min(0),
  > +  price: z.number().int().min(0).max(2_147_483_647),
  > ```
  > </details>

- [ ] ~~Use andRequired helper instead of and() for consistency — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M51qRJU -->
  - _Reason: Style preference. The conditions array is never empty in this code path, so and() is correct. Consistency is nice but not a bug._
  > **services/market/src/business-directory/business-directory.service.ts:299**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > For consistency and robustness, it's better to use the `andRequired` helper function here, just as it's used in other parts of the service. While `and()` works in this specific case because the `conditions` array is never empty, using `andRequired` makes the code more resilient to future changes and aligns with the established pattern in the new shared helpers.
  >
  > ```suggestion
  >     const whereClause = andRequired(...conditions);
  > ```

- [ ] ~~Use InternalServerErrorException instead of bare Error in andRequired — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51qWed -->
  - _Reason: The guard should never fire in practice (callers always pass conditions). If it does, a bare Error is fine — NestJS catches it anyway. Not a functional issue._
  > **services/market/src/shared/query-helpers.ts:9**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Use `InternalServerErrorException` instead of bare `Error` to maintain the HTTP error contract.**
  >
  > Line 8 throws a bare `Error`, which bypasses the NestJS exception handling and returns a malformed error response. The sibling function `firstOrThrow` (line 15) correctly uses `InternalServerErrorException` — follow that pattern here. `InternalServerErrorException` is already imported on line 2.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >  export function andRequired(...conditions: (SQL | undefined)[]): SQL {
  >    const result = and(...conditions);
  > -  if (!result) throw new Error('and() returned undefined — no conditions provided');
  > +  if (!result) {
  > +    throw new InternalServerErrorException(
  > +      'and() returned undefined — no conditions provided',
  > +    );
  > +  }
  >    return result;
  >  }
  > ```
  > </details>
