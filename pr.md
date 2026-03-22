# PR #34 — feat: market investment crud eoi

> Generated: 2026-03-22 | Branch: feat/market-investment-crud-eoi | Last updated: 2026-03-22 18:15

## Worth Fixing

- [x] `withdraw` doesn't decrement denormalized `interestCount`, causing counter drift — @devin-ai-integration, @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M51-bQF --> <!-- thread:PRRT_kwDORjaF4M51-d-E -->
  > **services/market/src/investment-applications/investment-applications.service.ts:137**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-89038f282e3a4f05b0e7665a70c14f8b_0001", "file_path": "services/market/src/investment-applications/investment-applications.service.ts", "start_line": 130, "end_line": 137, "side": "RIGHT"} -->
  >
  > :red_circle: **`withdraw` does not decrement the denormalized `interestCount`, causing counter drift**
  >
  > `submitInterest` at `investment-applications.service.ts:108-118` fires a fire-and-forget UPDATE to increment `investmentOpportunities.interestCount` when an application is created. However, the `withdraw` method at `investment-applications.service.ts:123-138` only updates the application status to `'withdrawn'` — it never decrements the counter. Over time, as investors withdraw their interest, the `interestCount` on opportunities will become inflated and inaccurate, since it only ever goes up.
  >
  > ```suggestion
  >     const [updated] = await this.db
  >       .update(investmentApplications)
  >       .set({ status: 'withdrawn' })
  >       .where(eq(investmentApplications.id, app.id))
  >       .returning();
  >
  >     if (!updated) throw new NotFoundException('Application not found');
  >
  >     // Decrement denormalized interest count (fire-and-forget)
  >     void this.db
  >       .update(investmentOpportunities)
  >       .set({ interestCount: sql`GREATEST(${investmentOpportunities.interestCount} - 1, 0)` })
  >       .where(eq(investmentOpportunities.id, opportunityId))
  >       .then(
  >         () => undefined,
  >         (err: unknown) => {
  >           this.logger.error('Failed to decrement interest count', err);
  >         },
  >       );
  >
  >     return updated;
  > ```
  >
  > ---
  > *Was this helpful? React with :thumbsup: or :thumbsdown: to provide feedback.*

  > **services/market/src/investment-applications/investment-applications.service.ts:137**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `withdraw` method correctly updates the application status to 'withdrawn', but it doesn't decrement the denormalized `interestCount` on the corresponding `investmentOpportunities` record. Since `submitInterest` increments this counter, `withdraw` should perform the opposite action to maintain data consistency. Using `GREATEST(0, ...)` is a good defensive measure to prevent the count from going below zero.
  >
  > ```typescript
  >     // Decrement denormalized interest count (fire-and-forget)
  >     void this.db
  >       .update(investmentOpportunities)
  >       .set({ interestCount: sql`GREATEST(0, ${investmentOpportunities.interestCount} - 1)` })
  >       .where(eq(investmentOpportunities.id, opportunityId))
  >       .catch((err: unknown) => {
  >         this.logger.error('Failed to decrement interest count', err);
  >       });
  >
  >     return updated;
  > ```

- [x] Filename without a dot produces the full filename as S3 key extension — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M51-bQP -->
  > **services/market/src/investment-applications/investment-applications.service.ts:258**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-89038f282e3a4f05b0e7665a70c14f8b_0002", "file_path": "services/market/src/investment-applications/investment-applications.service.ts", "start_line": 258, "end_line": 258, "side": "RIGHT"} -->
  >
  > :yellow_circle: **Filename without a dot produces the full filename as the S3 key "extension"**
  >
  > In `generateDocUploadUrl`, the extension is extracted via `dto.filename.split('.').pop() ?? 'pdf'`. If the filename has no dot (e.g. `"report"`), `split('.')` returns `["report"]` and `.pop()` yields `"report"` (not `undefined`), so the fallback `'pdf'` is never used. The resulting S3 key becomes something like `investments/.../docs/<id>.report`. The `DocumentUploadDto` at `document-upload.dto.ts:5` only validates `z.string().min(1)` with no requirement for a dot, so such filenames pass validation.
  >
  > ```suggestion
  >     const parts = dto.filename.split('.');
  >     const ext = parts.length > 1 ? parts.pop() : 'pdf';
  > ```
  >
  > ---
  > *Was this helpful? React with :thumbsup: or :thumbsdown: to provide feedback.*

- [x] TOCTOU race and missing `updatedAt` in `withdraw` — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-jJx -->
  > **services/market/src/investment-applications/investment-applications.service.ts:138**
  >
  > _:warning: Potential issue_ | _:orange_circle: Major_
  >
  > **TOCTOU race and missing `updatedAt` in withdraw.**
  >
  > Two issues here:
  >
  > 1. **Race condition**: The status is checked then updated without an atomic WHERE condition. If another request transitions the application to `accepted` between the check and update, the withdraw would still succeed.
  >
  > 2. **Missing `updatedAt`**: Per project conventions (Drizzle/PostgreSQL), `updatedAt` should be set explicitly at the application layer on every write.
  >
  >
  > <details>
  > <summary>:wrench: Proposed fix</summary>
  >
  > ```diff
  >    async withdraw(opportunityId: string, investorId: string): Promise<Application> {
  >      const app = await this.findByOpportunityAndInvestor(opportunityId, investorId);
  >      if (!app) throw new NotFoundException('Application not found');
  >      if (!WITHDRAWABLE_STATES.includes(app.status)) {
  >        throw new ConflictException(`Cannot withdraw from ${app.status} status`);
  >      }
  >
  >      const [updated] = await this.db
  >        .update(investmentApplications)
  > -      .set({ status: 'withdrawn' })
  > -      .where(eq(investmentApplications.id, app.id))
  > +      .set({ status: 'withdrawn', updatedAt: new Date() })
  > +      .where(
  > +        and(
  > +          eq(investmentApplications.id, app.id),
  > +          sql`${investmentApplications.status} = ANY(${WITHDRAWABLE_STATES})`,
  > +        ),
  > +      )
  >        .returning();
  >
  > -    if (!updated) throw new NotFoundException('Application not found');
  > +    if (!updated) {
  > +      throw new ConflictException('Application state changed, withdrawal failed');
  > +    }
  >      return updated;
  >    }
  > ```
  > </details>
  >
  > Based on learnings: "updated_at/updatedAt should be managed by the application layer at update time."
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->

- [x] TOCTOU race and missing `updatedAt` in `updateStatus` — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-jJz -->
  > **services/market/src/investment-applications/investment-applications.service.ts:157**
  >
  > _:warning: Potential issue_ | _:orange_circle: Major_
  >
  > **Same issues in `updateStatus`: TOCTOU race and missing `updatedAt`.**
  >
  > The pattern repeats here—status is checked then updated without atomic verification, and `updatedAt` is not set.
  >
  >
  > <details>
  > <summary>:wrench: Proposed fix</summary>
  >
  > ```diff
  >    async updateStatus(id: string, dto: UpdateApplicationStatusDto): Promise<Application> {
  >      const app = await this.findById(id);
  >      if (!app) throw new NotFoundException('Application not found');
  >
  >      const allowed = ADMIN_TRANSITIONS[app.status];
  >      if (!allowed?.includes(dto.status)) {
  >        throw new ConflictException(`Invalid transition: ${app.status} -> ${dto.status}`);
  >      }
  >
  >      const [updated] = await this.db
  >        .update(investmentApplications)
  > -      .set({ status: dto.status as Application['status'] })
  > -      .where(eq(investmentApplications.id, id))
  > +      .set({ status: dto.status as Application['status'], updatedAt: new Date() })
  > +      .where(
  > +        and(
  > +          eq(investmentApplications.id, id),
  > +          eq(investmentApplications.status, app.status),
  > +        ),
  > +      )
  >        .returning();
  >
  > -    if (!updated) throw new NotFoundException('Application not found');
  > +    if (!updated) {
  > +      throw new ConflictException('Application state changed concurrently');
  > +    }
  >      return updated;
  >    }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->

## Not Worth Fixing

- [ ] ~~Move `approveOpportunity` and `toggleFeatured` to `InvestmentOpportunitiesController` — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M51-d-D -->
  - _Reason: SRP architectural opinion. These endpoints work correctly from the current controller and moving them is a refactor outside this PR's scope._
  > **services/market/src/investment-applications/investment-applications.controller.ts:90**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `approveOpportunity` and `toggleFeatured` methods perform administrative actions on `InvestmentOpportunity` entities. Placing them in the `InvestmentApplicationsController` violates the single-responsibility principle. These endpoints should be moved to the `InvestmentOpportunitiesController` to keep all opportunity-related logic consolidated in one place.

- [ ] ~~Await cache invalidation instead of fire-and-forget — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M51-d-H -->
  - _Reason: Fire-and-forget for cache invalidation is standard practice. Awaiting would cause mutation API calls to fail on Redis issues, which is worse than briefly stale cache._
  > **services/market/src/investment-opportunities/investment-opportunities.service.ts:105**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The current fire-and-forget approach to cache invalidation is risky. If `scanAndDelete` fails, the API call succeeds, but the cache remains stale. This can lead to users seeing outdated information after a successful mutation.
  >
  > To improve data consistency, you should `await` the cache invalidation. Please change this method to be `async` and `await` all calls to it in the mutation methods (`create`, `update`, `close`, `approve`, `toggleFeatured`). For example, `this.invalidateCache()` should become `await this.invalidateCache()`.
  >
  > ```suggestion
  >   private async invalidateCache(): Promise<void> {
  >     try {
  >       await scanAndDelete(this.redis, `${CACHE_PREFIX}:*`);
  >     } catch (err: unknown) {
  >       this.logger.error('Cache invalidation failed', err);
  >     }
  >   }
  > ```

- [ ] ~~Inconsistent singular/plural in admin route naming — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M51-d-I -->
  - _Reason: Style nitpick with no functional impact._
  > **services/market/src/investment-applications/investment-applications.controller.ts:86**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > There's an inconsistency in the naming of admin-related routes. For example, you have `admin/investment/interests` (singular `investment`) and `admin/investments/:id/approve` (plural `investments`). For better clarity and maintainability, it's recommended to use a consistent naming convention for resource paths. Consider standardizing on either singular or plural for all related routes.

- [ ] ~~Catch unique constraint violation in `submitInterest` for concurrent duplicates — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-jJv -->
  - _Reason: DB unique constraint already prevents duplicates. The pre-check gives a clean error for 99.9% of cases; the remaining race window is negligible for this use case._
  > **services/market/src/investment-applications/investment-applications.service.ts:91**
  >
  > _:warning: Potential issue_ | _:yellow_circle: Minor_
  >
  > **Duplicate check doesn't handle concurrent insert race.**
  >
  > The code checks for duplicates then inserts, but two concurrent requests could both pass the check. The comment mentions a DB unique constraint as backup, but the service doesn't catch the resulting DB error to return a clean `ConflictException`.
  >
  >
  > <details>
  > <summary>:wrench: Catch constraint violation</summary>
  >
  > ```diff
  > +import { isDatabaseError } from '../shared/db-errors'; // or similar helper
  >
  >    // Check for duplicate (DB unique constraint is backup, but we give a better error message)
  >    const existing = await this.findByOpportunityAndInvestor(opportunityId, investorId);
  >    if (existing) {
  >      throw new ConflictException('ALREADY_EXPRESSED_INTEREST');
  >    }
  >
  > -  const application = firstOrThrow(
  > -    await this.db
  > -      .insert(investmentApplications)
  > -      .values({
  > -        // ...
  > -      })
  > -      .returning(),
  > -  );
  > +  try {
  > +    const application = firstOrThrow(
  > +      await this.db
  > +        .insert(investmentApplications)
  > +        .values({
  > +          // ...
  > +        })
  > +        .returning(),
  > +    );
  > +    return application;
  > +  } catch (err) {
  > +    if (isDatabaseError(err) && err.code === '23505') { // unique_violation
  > +      throw new ConflictException('ALREADY_EXPRESSED_INTEREST');
  > +    }
  > +    throw err;
  > +  }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->

- [ ] ~~TOCTOU race in `close` method — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-jJ5 -->
  - _Reason: Admin-only action on a low-traffic internal tool. The race window is negligible and the consequence (closing an already-transitioning opportunity) is benign._
  > **services/market/src/investment-opportunities/investment-opportunities.service.ts:293**
  >
  > _:warning: Potential issue_ | _:yellow_circle: Minor_
  >
  > **TOCTOU race in `close` method.**
  >
  > Similar to the applications service, there's a window between checking `existing.status` and performing the update where another request could change the status.
  >
  >
  > <details>
  > <summary>:wrench: Proposed fix with atomic WHERE</summary>
  >
  > ```diff
  >    async close(id: string): Promise<Opportunity> {
  >      const existing = await this.findRaw(id);
  >      if (!existing) throw new NotFoundException('Opportunity not found');
  >      if (existing.status === 'closed') {
  >        throw new ConflictException('Opportunity is already closed');
  >      }
  >
  >      const [updated] = await this.db
  >        .update(investmentOpportunities)
  >        .set({ status: 'closed', updatedAt: new Date() })
  > -      .where(eq(investmentOpportunities.id, id))
  > +      .where(
  > +        and(
  > +          eq(investmentOpportunities.id, id),
  > +          sql`${investmentOpportunities.status} != 'closed'`,
  > +        ),
  > +      )
  >        .returning();
  >
  > -    if (!updated) throw new NotFoundException('Opportunity not found');
  > +    if (!updated) {
  > +      throw new ConflictException('Opportunity is already closed');
  > +    }
  >
  >      this.invalidateCache();
  >      return updated;
  >    }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->

- [ ] ~~TOCTOU race in `approve` method — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-jJ7 -->
  - _Reason: Admin-only action, same as close. The approve method already sets `updatedAt`, so only the race condition remains, which is negligible for this context._
  > **services/market/src/investment-opportunities/investment-opportunities.service.ts:329**
  >
  > _:warning: Potential issue_ | _:yellow_circle: Minor_
  >
  > **TOCTOU race in `approve` method.**
  >
  > Same race condition pattern—status could change between the check and update. Since approval is an admin action, the impact is lower, but for consistency with state machine integrity:
  >
  >
  > <details>
  > <summary>:wrench: Proposed fix</summary>
  >
  > ```diff
  >      const [updated] = await this.db
  >        .update(investmentOpportunities)
  >        .set({
  >          status: 'active',
  >          isVerified: true,
  >          approvedBy: adminId,
  >          approvedAt: new Date(),
  >          updatedAt: new Date(),
  >        })
  > -      .where(eq(investmentOpportunities.id, id))
  > +      .where(
  > +        and(
  > +          eq(investmentOpportunities.id, id),
  > +          eq(investmentOpportunities.status, 'review'),
  > +        ),
  > +      )
  >        .returning();
  >
  > -    if (!updated) throw new NotFoundException('Opportunity not found');
  > +    if (!updated) {
  > +      throw new ConflictException('Opportunity status changed, approval failed');
  > +    }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->
