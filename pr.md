# PR #35 — feat: market listing reviews

> Generated: 2026-03-22 | Branch: feat/market-listing-reviews | Last updated: 2026-03-22

## Worth Fixing

- [x] `markHelpful` endpoint is vulnerable to vote-stuffing — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M519M-6 -->
  > **services/market/src/reviews/reviews.controller.ts:61**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `markHelpful` endpoint is vulnerable to abuse. As it is currently implemented, any authenticated user can call this endpoint repeatedly for the same review, which would artificially inflate its `helpfulCount`.
  >
  > To prevent this, you should track which users have marked a review as helpful. The controller method should accept the current user's information and pass their ID to the service. The service should then implement logic to ensure a user can only mark a review as helpful once. This typically involves a new database table (e.g., `review_helpful_votes`) to record the votes.
  >
  > ```suggestion
  >   @Post(':id/helpful')
  >   markHelpful(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
  >     return this.reviewsService.markHelpful(id, user.sub);
  >   }
  > ```
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. Use database transactions to ensure atomicity for operations involving multiple related entities, especially for many-to-many relationships, as this is a non-negotiable requirement for data integrity.
  > </details>

## Not Worth Fixing

- [ ] ~~Optimize `recalculateRating` with a CTE instead of two subqueries — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M519M-7 -->
  - _Reason: Performance optimization suggestion — the current implementation is correct and readable. Two subqueries on an indexed `listing_id` column within a transaction are fine for this workload. Not a bug or security issue._
  > **services/market/src/reviews/reviews.service.ts:57**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The `recalculateRating` method currently executes two separate subqueries against the `reviews` table to calculate the average rating and the total count. This can be optimized by using a Common Table Expression (CTE) to perform a single scan of the table. This change will improve both performance and readability of the SQL query.
  >
  > ```typescript
  >     await tx.execute(sql`
  >       WITH active_reviews AS (
  >         SELECT rating FROM market.reviews
  >         WHERE listing_id = ${listingId} AND is_active = true
  >       )
  >       UPDATE market.listings
  >       SET rating_avg = COALESCE((SELECT AVG(rating)::real FROM active_reviews), 0),
  >           review_count = (SELECT COUNT(*)::int FROM active_reviews),
  >           updated_at = NOW()
  >       WHERE id = ${listingId}
  >     `);
  > ```
