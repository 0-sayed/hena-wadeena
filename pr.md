# PR #134 — feat(t36): employment board

> Generated: 2026-04-13 | Branch: worktree-t36-employment-board | Last updated: 2026-04-13 10:45

## Worth Fixing

- [x] Race condition in slot enforcement — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foDj -->
  > **services/market/src/job-applications/job-applications.service.ts:169**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > There is a potential race condition in the slot enforcement logic. The count of accepted applications is checked in a separate query before the update. In a concurrent environment, multiple requests could pass this check simultaneously, leading to more accepted applications than the job's `slots` limit. Consider wrapping this logic in a database transaction or incorporating the slot availability check directly into the `UPDATE` statement's `WHERE` clause as an optimistic concurrency guard.
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. When performing an update after a state check, include the state in the WHERE clause of the UPDATE statement as an optimistic concurrency guard to prevent TOCTOU race conditions.
  > 2. Use database transactions to ensure atomicity for operations involving multiple related entities, especially for many-to-many relationships, as this is a non-negotiable requirement for data integrity.
  > </details>

- [x] Wallet transfer lacks atomicity — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foDm -->
  > **services/market/src/job-applications/job-applications.service.ts:208**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The wallet transfer is performed after the application status has been updated to `completed` in the database. If the cross-service HTTP call fails, the worker remains unpaid while the system considers the job finished. This operation lacks atomicity or a robust fallback mechanism. Consider implementing a background job/outbox pattern for payments or using a database transaction to ensure atomicity for operations involving multiple related entities.
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. Use database transactions to ensure atomicity for operations involving multiple related entities, especially for many-to-many relationships, as this is a non-negotiable requirement for data integrity.
  > </details>

- [x] Slot count excludes `completed` status — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foDr -->
  > **services/market/src/job-applications/job-applications.service.ts:166**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The slot count check should also include applications with the `completed` status. If a worker finishes the job, their slot should still be considered "filled" for the purpose of preventing new applicants from being accepted beyond the original limit.
  >
  > ```suggestion
  >             inArray(jobApplications.status, ['accepted', 'in_progress', 'completed']),
  > ```

- [x] User applications query returns soft-deleted job posts — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foD4 -->
  > **services/market/src/job-applications/job-applications.service.ts:120**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The query for user applications should filter out soft-deleted job posts to ensure that users do not see applications for jobs that have been removed from the platform. Note: You may need to add `isNull` to the `drizzle-orm` imports.
  >
  > ```suggestion
  >         .innerJoin(jobPosts, and(eq(jobApplications.jobId, jobPosts.id), isNull(jobPosts.deletedAt)))
  > ```

- [x] Update job post missing `deletedAt` guard in WHERE clause — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foD- -->
  > **services/market/src/job-posts/job-posts.service.ts:137**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > To prevent a TOCTOU (time-of-check to time-of-use) race condition, the `UPDATE` statement should include a check for `deletedAt` in its `WHERE` clause. Additionally, prefer an explicit ownership check before the operation to avoid silent failures, and use `NotFoundException` if the database operation with `.returning()` fails to return a row.
  >
  > ```suggestion
  >       await this.db.update(jobPosts).set(updates).where(and(eq(jobPosts.id, id), isNull(jobPosts.deletedAt))).returning(),
  > ```
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. When performing an update after a state check, include the state in the WHERE clause of the UPDATE statement as an optimistic concurrency guard to prevent TOCTOU race conditions.
  > 2. For database updates, prefer an explicit ownership check before the operation. This is more readable and avoids 'premature optimization' that can hide errors by silently succeeding with zero affected rows for non-existent or unauthorized records.
  > 3. As a style preference, use NotFoundException when a database operation with .returning() fails to return a row.
  > </details>

- [x] User reviews query returns soft-deleted job posts — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foEB -->
  > **services/market/src/job-applications/job-applications.service.ts:328**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > Similar to the applications query, the user reviews query should filter out reviews associated with soft-deleted job posts to maintain data consistency.
  >
  > ```suggestion
  >         .innerJoin(jobPosts, and(eq(jobReviews.jobId, jobPosts.id), isNull(jobPosts.deletedAt)))
  > ```

- [x] Re-activate withdrawn application missing WHERE status guard — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foEL -->
  > **services/market/src/job-applications/job-applications.service.ts:75**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > When re-activating a withdrawn application, the `UPDATE` statement should include `eq(jobApplications.status, 'withdrawn')` in the `WHERE` clause as an optimistic concurrency guard. Also, ensure an explicit ownership check is performed before the operation to clearly distinguish 'not found' from 'unauthorized' errors.
  >
  > ```suggestion
  >           .where(and(eq(jobApplications.id, existing.id), eq(jobApplications.status, 'withdrawn')))
  > ```
  >
  > <details>
  > <summary>References</summary>
  >
  > 1. When performing an update after a state check, include the state in the WHERE clause of the UPDATE statement as an optimistic concurrency guard to prevent TOCTOU race conditions.
  > 2. For database updates, prefer an explicit ownership check before the operation. This is more readable and avoids 'premature optimization' that can hide errors by silently succeeding with zero affected rows for non-existent or unauthorized records.
  > </details>

- [x] Poster can apply to their own job — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M56foEN -->
  > **services/market/src/job-applications/job-applications.service.ts:60**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > A user should not be able to apply for a job they posted themselves. Consider adding a check to prevent `applicantId` from matching `job.posterId`.

- [x] Duplicate-apply race condition surfaces as 500 — @codoki-pr-intelligence <!-- thread:PRRT_kwDORjaF4M56fpvk -->
  > **services/market/src/job-applications/job-applications.service.ts:83**
  >
  > <!-- CODOKI_INLINE -->
  > 🔷 **Medium**: Duplicate-apply race is not handled: two concurrent apply calls can race past the existence check and one insert will throw a unique violation (likely surfacing as 500). Use onConflictDoNothing with the unique target and convert that path into a ConflictException.
  >
  > ts
  > const [app] = await this.db
  >   .insert(jobApplications)
  >   .values({ jobId, applicantId, status: 'pending', noteAr: dto.noteAr })
  >   .onConflictDoNothing({ target: [jobApplications.jobId, jobApplications.applicantId] })
  >   .returning();
  > if (!app) throw new ConflictException('You have already applied for this job');
  > ```
  > ```

- [x] `findApplicationsForJob` exposes all applications without poster auth — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M56fxVH -->
  > **services/market/src/job-applications/job-applications.service.ts:99**
  >
  > <!-- metadata:{"confidence":9} -->
  > P1: `findApplicationsForJob` lacks poster authorization and exposes application data for arbitrary jobs.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At services/market/src/job-applications/job-applications.service.ts, line 99:
  >
  > <comment>`findApplicationsForJob` lacks poster authorization and exposes application data for arbitrary jobs.</comment>
  >
  > <file context>
  > @@ -0,0 +1,373 @@
  > +    return app;
  > +  }
  > +
  > +  async findApplicationsForJob(jobId: string): Promise<PaginatedResponse<JobApplication>> {
  > +    const items = await this.db
  > +      .select()
  > </file context>
  > ```
  >
  > </details>

- [x] Soft-delete doesn't update `updatedAt` — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M56fxVK -->
  > **services/market/src/job-posts/job-posts.service.ts:145**
  >
  > <!-- metadata:{"confidence":9} -->
  > P2: Soft-deleting a job post should also update `updatedAt` to keep audit metadata consistent.
  >
  > ```suggestion
  >     await this.db.update(jobPosts).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(jobPosts.id, id));
  > ```

- [x] Paginated job-post queries missing `orderBy` — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M56fxVQ -->
  > **services/market/src/job-posts/job-posts.service.ts:1**
  >
  > <!-- metadata:{"confidence":8} -->
  > P2: Paginated job-post queries are missing an explicit `orderBy`, which makes page boundaries unstable.

- [x] `update()` doesn't refresh `updatedAt` — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M56fxVT -->
  > **services/market/src/job-posts/job-posts.service.ts:124**
  >
  > <!-- metadata:{"confidence":9} -->
  > P2: `update()` does not refresh `updatedAt`, so edited job posts keep a stale modification timestamp.

- [x] `JobCategory`/`CompensationType` duplicated in `format.ts` — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M56fxVV -->
  > **apps/web/src/lib/format.ts:357**
  >
  > <!-- metadata:{"confidence":7} -->
  > P2: JobCategory and CompensationType are already defined in @hena-wadeena/types. Duplicating the value sets here creates two sources of truth; use the shared types instead to avoid drift.

- [x] Jobs tab nav matcher matches `/jobs-archive` as active — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0Fy -->
  > **apps/web/src/components/layout/Header.tsx:192**
  >
  > ⚠️ Potential issue | 🟡 Minor
  >
  > **Fix jobs tab matcher to avoid false active states.**
  >
  > Line 191 matches any path starting with `/jobs`, including unrelated routes like `/jobs-archive`. Use exact `/jobs` or `/jobs/` prefix matching.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > -      matcher: (pathname) => pathname.startsWith('/jobs'),
  > +      matcher: (pathname) => pathname === '/jobs' || pathname.startsWith('/jobs/'),
  > ```
  > </details>

- [x] Error state unreachable in `EditJobPage` — failed job spins forever — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0F- -->
  > **apps/web/src/pages/jobs/EditJobPage.tsx:128**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Show the error state before the `!form` fallback.**
  >
  > When `useJob()` fails or returns no record, `form` never initializes, so Line 109 keeps returning the skeleton and the error UI at Line 120 is unreachable. Missing/failed jobs will spin forever instead of surfacing the error.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > -  if (isLoading || !form) {
  > +  if (isError || (!isLoading && !job)) {
  > +    return (
  > +      <Layout title="تعديل الوظيفة">
  > +        <div className="container py-20 text-center">
  > +          <p className="text-muted-foreground">تعذر تحميل الوظيفة.</p>
  > +        </div>
  > +      </Layout>
  > +    );
  > +  }
  > +
  > +  if (isLoading || !form) {
  >      return (
  >        <Layout title="تعديل الوظيفة">
  >          <div className="container py-10 space-y-4">
  >            <Skeleton className="h-10 w-32 rounded-xl" />
  >            <Skeleton className="h-64 rounded-2xl" />
  >          </div>
  >        </Layout>
  >      );
  >    }
  > -
  > -  if (isError || !job) {
  > -    return (
  > -      <Layout title="تعديل الوظيفة">
  > -        <div className="container py-20 text-center">
  > -          <p className="text-muted-foreground">تعذر تحميل الوظيفة.</p>
  > -        </div>
  > -      </Layout>
  > -    );
  > -  }
  > ```
  > </details>

- [x] `canApply` is true while `useMyApplications` is still loading — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0GC -->
  > **apps/web/src/pages/jobs/JobDetailPage.tsx:47**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Gate `canApply` on the applications query finishing.**
  >
  > `myApplication` is computed from `myAppsData`, but while that query is still unresolved it falls back to `undefined`, so `canApply` flips `true` for users who have already applied. That briefly re-enables the submit path and can trigger duplicate application attempts.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > -  const { data: myAppsData } = useMyApplications(isAuthenticated);
  > +  const {
  > +    data: myAppsData,
  > +    isLoading: isLoadingMyApps,
  > +    isError: isMyAppsError,
  > +  } = useMyApplications(isAuthenticated);
  > @@
  > -  const canApply = isAuthenticated && !isPoster && job.status === 'open' && !myApplication;
  > +  const canApply =
  > +    isAuthenticated &&
  > +    !isPoster &&
  > +    job.status === 'open' &&
  > +    !isLoadingMyApps &&
  > +    !isMyAppsError &&
  > +    !myApplication;
  > ```
  > </details>

- [x] Review CTA shows before `useUserReviews` resolves — defeating duplicate-submit guard — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0GE -->
  > **apps/web/src/pages/jobs/MyApplicationsPage.tsx:99**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Wait for `useUserReviews` before showing the review CTA.**
  >
  > `workerRatings` defaults to `[]` while the reviews query is still loading, so completed applications can briefly show **"تقييم صاحب العمل"** even when the user already submitted that review. That defeats the duplicate-submission guard this page is using reviews for.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >  function ApplicationRow({
  >    app,
  >    workerRatings,
  > +  reviewsReady,
  >  }: {
  >    app: JobApplication;
  >    workerRatings: { applicationId: string }[];
  > +  reviewsReady: boolean;
  >  }) {
  > @@
  > -        {app.status === 'completed' && !hasRated && !showReview && (
  > +        {reviewsReady && app.status === 'completed' && !hasRated && !showReview && (
  >            <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
  >              تقييم صاحب العمل
  >            </Button>
  >          )}
  > @@
  > -  const { data: myReviews } = useUserReviews(user?.id, 'reviewer');
  > +  const { data: myReviews, isLoading: isLoadingReviews } = useUserReviews(user?.id, 'reviewer');
  > @@
  > -                <ApplicationRow key={app.id} app={app} workerRatings={workerRatings} />
  > +                <ApplicationRow
  > +                  key={app.id}
  > +                  app={app}
  > +                  workerRatings={workerRatings}
  > +                  reviewsReady={!isLoadingReviews}
  > +                />
  > ```
  > </details>

- [x] `startsAt`/`endsAt` sent as date strings instead of ISO datetimes — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0GH -->
  > **apps/web/src/pages/jobs/PostJobPage.tsx:90**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Send ISO datetime strings for `startsAt`/`endsAt` payload fields.**
  >
  > Line 89 and Line 90 forward `YYYY-MM-DD` values from `type="date"` inputs. The create-job API schema expects datetime format, so selecting dates can be rejected server-side.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > +  const toIsoDateTime = (date: string) => `${date}T00:00:00.000Z`;
  > +
  >    async function handleSubmit(e: React.FormEvent) {
  > @@
  > -        startsAt: form.startsAt || undefined,
  > -        endsAt: form.endsAt || undefined,
  > +        startsAt: form.startsAt ? toIsoDateTime(form.startsAt) : undefined,
  > +        endsAt: form.endsAt ? toIsoDateTime(form.endsAt) : undefined,
  > ```
  > </details>

- [x] No DB constraint prevents inverted `startsAt`/`endsAt` — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0GQ -->
  > **services/market/src/db/schema/job-posts.ts:30**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Add a DB check to prevent inverted job date windows.**
  >
  > Line 22–Line 23 currently allow `endsAt` earlier than `startsAt`, which can persist impossible schedules and break downstream workflow logic.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >    (t) => [
  >      check('job_posts_compensation_non_negative', sql`${t.compensation} >= 0`),
  >      check('job_posts_slots_positive', sql`${t.slots} >= 1`),
  > +    check(
  > +      'job_posts_valid_date_range',
  > +      sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.endsAt} >= ${t.startsAt}`,
  > +    ),
  >      index('idx_job_posts_poster_id').on(t.posterId),
  > ```
  > </details>

- [x] No Zod validation for `endsAt >= startsAt` — @coderabbitai <!-- thread:PRRT_kwDORjaF4M56f0GR -->
  > **services/market/src/job-posts/dto/job-post.schema.ts:17**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Add start/end chronology validation.**
  >
  > Line 16 and Line 17 validate ISO shape only; they currently allow `endsAt` earlier than `startsAt`, which can create invalid posting windows.
  >
  > <details>
  > <summary>Proposed fix</summary>
  >
  > ```diff
  >    startsAt: z.iso.datetime().optional(),
  >    endsAt: z.iso.datetime().optional(),
  > -});
  > +}).refine(
  > +  (data) => {
  > +    if (!data.startsAt || !data.endsAt) return true;
  > +    return new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime();
  > +  },
  > +  {
  > +    path: ['endsAt'],
  > +    message: 'endsAt must be on or after startsAt',
  > +  },
  > +);
  > ```
  > </details>

## Not Worth Fixing

- [ ] ~~`ROLE_ACCESS` excludes role pages for TOURIST/RESIDENT/STUDENT in docs — @cubic-dev-ai~~ <!-- thread:PRRT_kwDORjaF4M56fxVI -->
  - _Reason: This is in `docs/app-flow-map.html`, a standalone visualization file, not production code. The role filter is a UI feature of the docs page, not a runtime access control bug. Out of scope for this PR._
  > **docs/app-flow-map.html:1845**
  >
  > <!-- metadata:{"confidence":10} -->
  > P2: `ROLE_ACCESS` excludes `role` pages for TOURIST/RESIDENT/STUDENT, so role-gated nodes meant for those roles are hidden by the role filter.

- [ ] ~~Redundant `ms-2` on icon in `JobDetailPage.tsx` — @cubic-dev-ai~~ <!-- thread:PRRT_kwDORjaF4M56fxVW -->
  - _Reason: Minor visual style nitpick. Button has `gap-2` but `ms-2` on the icon won't cause a layout break in an Arabic RTL UI. Not worth a fix in isolation._
  > **apps/web/src/pages/jobs/JobDetailPage.tsx:186**
  >
  > <!-- metadata:{"confidence":8} -->
  > P3: Remove the redundant `ms-2` on the icon; Button already provides child spacing via `gap-2`, so this adds extra spacing.

- [ ] ~~Redundant `ms-2` on icon in `JobBoardPage.tsx` — @cubic-dev-ai~~ <!-- thread:PRRT_kwDORjaF4M56fxVY -->
  - _Reason: Same as JobDetailPage — minor visual nitpick, not a functional issue._
  > **apps/web/src/pages/jobs/JobBoardPage.tsx:127**
  >
  > <!-- metadata:{"confidence":9} -->
  > P3: Remove the redundant `ms-2` margin on the icon since Button already uses gap-based spacing.

- [ ] ~~Keyboard accessibility for nodes in `app-flow-map.html` — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M56f0GL -->
  - _Reason: Docs-only visualization file. Keyboard accessibility is a nice-to-have for a developer tool, not a production app. Out of scope for this PR._
  > **docs/app-flow-map.html:1988**
  >
  > ⚠️ Potential issue | 🟠 Major
  >
  > **Make node selection keyboard-accessible.**
  >
  > Node interaction is mouse-only (`click` on SVG `<g>`), so keyboard users cannot inspect nodes.
