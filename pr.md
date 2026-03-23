# PR #35 — feat: market listing reviews

> Generated: 2026-03-23 | Branch: feat/market-listing-reviews | Last updated: 2026-03-23 14:30

## Worth Fixing

- [x] FK violation in markHelpful causes 500 instead of 404 — @devin-ai-integration, @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M51_CQ9 --> <!-- thread:PRRT_kwDORjaF4M52BNkW -->
  > **services/market/src/reviews/reviews.service.ts:221**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-e9784c2d1cdd477dab1e88a918be626f_0001", "file_path": "services/market/src/reviews/reviews.service.ts", "start_line": 216, "end_line": 221, "side": "RIGHT"} -->
  >
  > 🔴 **Foreign-key violation in `markHelpful` not caught, causing 500 instead of 404**
  >
  > When `markHelpful` is called with a `reviewId` that doesn't exist in the `reviews` table, the `tx.insert(reviewHelpfulVotes).values({ reviewId: id, userId })` at line 205 throws a PostgreSQL foreign-key violation (code `23503`). The `catch` block at line 216 only checks for `isUniqueViolation` (code `23505`), so the raw database error propagates as a 500 Internal Server Error instead of a 404.
  >
  > The established pattern in this codebase is to catch FK violations and map them to `NotFoundException` — see `services/market/src/commodity-prices/commodity-prices.service.ts:236` and `:266` which both use `isForeignKeyViolation` for exactly this purpose. The helper `isForeignKeyViolation` is already defined in `services/market/src/shared/error-helpers.ts:12` but is not imported here.
  >
  > ```suggestion
  >     } catch (err: unknown) {
  >       if (isUniqueViolation(err)) {
  >         throw new ConflictException('You have already marked this review as helpful');
  >       }
  >       if (isForeignKeyViolation(err)) {
  >         throw new NotFoundException('Review not found');
  >       }
  >       throw err;
  >     }
  > ```

  > **services/market/src/reviews/reviews.service.ts:220**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > If a `reviewId` that doesn't exist is provided, the `insert` into `reviewHelpfulVotes` will fail with a foreign key constraint violation. This is not currently handled and will result in a 500 error. You should catch this and throw a `NotFoundException` for a better API experience.
  >
  > ```typescript
  >       if (isUniqueViolation(err)) {
  >         throw new ConflictException('You have already marked this review as helpful');
  >       }
  >       if (isForeignKeyViolation(err)) {
  >         throw new NotFoundException('Review not found');
  >       }
  >       throw err;
  > ```

- [x] Soft-deleted reviews block users from re-reviewing the same listing — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M51_tPH -->
  > **services/market/src/reviews/reviews.service.ts:199**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-996ef7e45d0e4191a96a90b2aa5d1c61_0002", "file_path": "services/market/src/reviews/reviews.service.ts", "start_line": 191, "end_line": 199, "side": "RIGHT"} -->
  >
  > 🔴 **Soft-deleted reviews block users from re-reviewing the same listing due to unconditional unique constraint**
  >
  > The `remove` method (line 191-199) soft-deletes reviews by setting `is_active = false`, but the `reviews` table's unique constraint `reviews_reviewer_listing_unique` on `(reviewerId, listingId)` (`services/market/src/db/schema/reviews.ts:29`) is unconditional — it applies to all rows regardless of `is_active`. After a review is soft-deleted, the same user attempting to create a new review for that listing hits the unique constraint, and the `create` method at line 123 converts it to `ConflictException('You have already reviewed this listing')`. This creates a permanently broken workflow. Compare with the listings schema which correctly uses a partial unique index: `uniqueIndex('listings_slug_active_unique').on(t.slug).where(sql\`...IS NULL\`)` at `services/market/src/db/schema/listings.ts:66-68`. The fix requires changing the constraint in `reviews.ts` to a partial unique index filtered on `is_active = true`, then regenerating the migration.
  >
  > <details>
  > <summary>Prompt for agents</summary>
  >
  > ```
  > In services/market/src/db/schema/reviews.ts, change line 29 from an unconditional unique constraint to a partial unique index that only applies to active reviews. Replace:
  >
  > unique('reviews_reviewer_listing_unique').on(t.reviewerId, t.listingId),
  >
  > with:
  >
  > uniqueIndex('reviews_reviewer_listing_unique').on(t.reviewerId, t.listingId).where(sql`${t.isActive} = true`),
  >
  > You will need to add uniqueIndex to the imports from drizzle-orm/pg-core. After making this change, regenerate the Drizzle migration with drizzle-kit generate to update the migration files.
  > ```
  >
  > </details>

- [x] Listing eligibility check not atomic with insert (race condition) — @coderabbitai, @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M51-6eV --> <!-- thread:PRRT_kwDORjaF4M52BNkZ -->
  > **services/market/src/reviews/reviews.service.ts:127**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Make the listing eligibility check atomic with the insert.**
  >
  > The active/deleted/owner checks happen before `db.transaction()`. If the listing is deactivated or soft-deleted in that gap, this path can still persist a review because the FK remains valid. Move the lookup and guards into the same transaction (ideally locking or conditionally selecting the listing there) so the precondition and write cannot drift apart.

  > **services/market/src/reviews/reviews.service.ts:121**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The check for the listing's existence and active status is performed outside the main database transaction. This creates a race condition: the listing could be deactivated or deleted after the check but before the review is inserted, leading to a review being created for an invalid listing. To ensure atomicity, the listing check should be moved inside the transaction.
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. Use database transactions to ensure atomicity for operations involving multiple related entities, especially for many-to-many relationships, as this is a non-negotiable requirement for data integrity.
  > </details>

- [x] Race condition: inactive reviews can still be mutated after precheck — @coderabbitai, @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M51-6eW --> <!-- thread:PRRT_kwDORjaF4M52BNka -->
  > **services/market/src/reviews/reviews.service.ts:178**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Don't mutate reviews that became inactive after the precheck.**
  >
  > Both paths call `findActiveReview()` first, but the later write only matches on `id`. If another request soft-deletes the review in between, this code still updates an inactive row and reports success. Guard the write with `isActive = true` and treat `0` affected rows as `NotFoundException`.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >        const [row] = await tx
  >          .update(reviews)
  >          .set({
  >            ...(dto.rating !== undefined && { rating: dto.rating }),
  >            ...(dto.title !== undefined && { title: dto.title }),
  >            ...(dto.comment !== undefined && { comment: dto.comment }),
  >            ...(dto.images !== undefined && { images: dto.images }),
  >            updatedAt: new Date(),
  >          })
  > -        .where(eq(reviews.id, id))
  > +        .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
  >          .returning();
  > @@
  > -      await tx
  > +      const [deleted] = await tx
  >          .update(reviews)
  >          .set({ isActive: false, updatedAt: new Date() })
  > -        .where(eq(reviews.id, id))
  > -        .execute();
  > +        .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
  > +        .returning({ id: reviews.id });
  > +
  > +      if (!deleted) throw new NotFoundException('Review not found');
  > ```
  > </details>

  > **services/market/src/reviews/reviews.service.ts:167**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > There's a potential race condition here. The review's active status is checked outside the transaction, but the update happens inside. If the review is deactivated between the check and the update, this code will update an inactive review. To prevent this, you should also check if the review is active within the update's `where` clause. This ensures you only update active reviews, and the operation fails atomically if the review's state has changed.
  >
  > ```suggestion
  >         .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
  > ```
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. Use database transactions to ensure atomicity for operations involving multiple related entities, especially for many-to-many relationships, as this is a non-negotiable requirement for data integrity.
  > </details>

- [x] Offset pagination needs a deterministic tie-breaker — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-6eU -->
  > **services/market/src/reviews/reviews.service.ts:78**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Offset pagination needs a deterministic tie-breaker.**
  >
  > `rating` and `helpful_count` will have lots of ties, but `orderBy` only uses one column. With `offset`/`limit`, equal-valued rows can reshuffle between requests and cause skipped or duplicated reviews across pages. Always add a unique secondary key here.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > -  private buildSort(sort: string): SQL {
  > +  private buildSort(sort: string): SQL[] {
  >      const [field, direction] = sort.split('|');
  > -    if (!field || !(field in SORTABLE_FIELDS)) return desc(reviews.createdAt);
  > +    if (!field || !(field in SORTABLE_FIELDS)) {
  > +      return [desc(reviews.createdAt), desc(reviews.id)];
  > +    }
  >      const column = SORTABLE_FIELDS[field as keyof typeof SORTABLE_FIELDS];
  > -    return direction === 'asc' ? asc(column) : desc(column);
  > +    const primary = direction === 'asc' ? asc(column) : desc(column);
  > +    const tieBreaker = direction === 'asc' ? asc(reviews.id) : desc(reviews.id);
  > +    return [primary, tieBreaker];
  >    }
  > @@
  > -    const orderBy = this.buildSort(query.sort);
  > +    const orderBy = this.buildSort(query.sort);
  > @@
  > -        .orderBy(orderBy)
  > +        .orderBy(...orderBy)
  > ```
  > </details>
  >
  > Also applies to: 226-236

## Not Worth Fixing

- [ ] ~~Register RedisStreamsService as a shared provider instead of per-module — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-6eS -->
  - _Reason: This is a pre-existing codebase-wide pattern (6+ modules), not something introduced by this PR. Refactoring it is out of scope._
  > **services/market/src/reviews/reviews.module.ts:9**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > <details>
  > <summary>🧩 Analysis chain</summary>
  >
  > 🏁 Script executed:
  >
  > ```shell
  > #!/bin/bash
  > set -euo pipefail
  >
  > echo "1) Find all module/provider declarations using RedisStreamsService"
  > rg -n --type=ts -C3 'RedisStreamsService|providers:\s*\[' services packages
  >
  > echo
  > echo "2) Narrow to `@Module` blocks that include RedisStreamsService in providers"
  > python - <<'PY'
  > from pathlib import Path
  > import re
  >
  > for p in Path("services").rglob("*.module.ts"):
  >     text = p.read_text(encoding="utf-8", errors="ignore")
  >     if "RedisStreamsService" in text and "@Module" in text:
  >         print(f"\n--- {p} ---")
  >         for m in re.finditer(r'@Module\(\{[\s\S]*?\}\)', text):
  >             block = m.group(0)
  >             if "RedisStreamsService" in block:
  >                 print(block[:1200])
  > PY
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > Length of output: 23088
  >
  > ---
  >
  >
  >
  > </details>
  >
  > **Register `RedisStreamsService` as a shared provider, not per-module.**
  >
  > `RedisStreamsService` is being instantiated in at least 6 separate modules (reviews, listings, business-directory, commodity-prices, identity/users, identity/auth), each maintaining its own `activeStreams`, `handlers`, and `retryCount` maps. This fragments stream state and runs cleanup logic multiple times. Create a shared provider in a central module (e.g., a dedicated RedisStreamsModule) and import/export it instead of re-declaring the service in each feature module.
