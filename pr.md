# PR #82 — fix(missing feats): add missing feats

> Generated: 2026-04-01 | Branch: fix/website-issues | Last updated: 2026-04-01 10:15

## Worth Fixing

- [ ] Lint failing — CI
  - [ ] `@typescript-eslint/no-unsafe-enum-comparison` in ContactPage.tsx:106 — comparing `user?.role` (UserRole enum) with string literal `'merchant'`

- [x] Include user ID in query keys to prevent cache leakage across sessions — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMSD -->
  > **apps/web/src/hooks/use-investment-applications.ts:12**
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
  > echo "=== useAuth hook ==="
  > fd -i 'use-auth\.(ts|tsx)$' apps/web/src/hooks -x sed -n '1,220p' {}
  >
  > echo
  > echo "=== auth context/provider ==="
  > fd -i 'auth-context\.(ts|tsx)$' apps/web/src/contexts -x sed -n '1,260p' {}
  >
  > echo
  > echo "=== React Query cache handling on auth changes ==="
  > rg -n -C3 'queryClient\.(clear|removeQueries|resetQueries|invalidateQueries)|logout|signOut|setUser|setToken' apps/web/src
  > ```
  >
  > Repository: 0-sayed/hena-wadeena
  >
  > Length of output: 29438
  >
  > ---
  >
  >
  >
  > </details>
  >
  > **Include user ID in query keys to prevent cache leakage across user sessions.**
  >
  > Both hooks return user-scoped data (current user's applications) but cache it under static or opportunity-specific keys that ignore the authenticated identity. When a user logs out, React Query does not clear these entries, so if another user logs in on the same client, they may see the previous user's cached data until refetch completes.
  >
  > Fix by including `user.id` in the queryKey:
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```typescript
  > export function useMyInvestmentApplications() {
  >   const { isAuthenticated, user } = useAuth();
  >
  >   return useQuery({
  >     queryKey: ['investment', 'applications', 'mine', user?.id] as const,
  >     queryFn: () => investmentApplicationsAPI.getMine(),
  >     enabled: isAuthenticated,
  >   });
  > }
  >
  > export function useOpportunityApplications(opportunityId: string) {
  >   const { isAuthenticated, user } = useAuth();
  >
  >   return useQuery({
  >     queryKey: ['investment', 'opportunities', opportunityId, 'applications', user?.id] as const,
  >     queryFn: () => investmentApplicationsAPI.getOpportunityApplications(opportunityId),
  >     enabled: isAuthenticated,
  >   });
  > }
  > ```
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/hooks/use-investment-applications.ts` around lines 5 - 12, The
  > queryKey for user-scoped hooks is missing the authenticated user's id, causing
  > cached data to leak between sessions; update useMyInvestmentApplications to
  > destructure user from useAuth (const { isAuthenticated, user } = useAuth()) and
  > include user?.id in the queryKey for useQuery (the queryFn remains
  > investmentApplicationsAPI.getMine and enabled stays isAuthenticated), and
  > similarly update useOpportunityApplications to include user?.id in its queryKey
  > while keeping its queryFn
  > investmentApplicationsAPI.getOpportunityApplications(opportunityId) and enabled
  > check.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Reject non-positive and non-integer `amountPiasters` in wallet functions — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMSH -->
  > **apps/web/src/lib/wallet-store.ts:138**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Reject non-positive and non-integer `amountPiasters`.**
  >
  > Both exported mutators accept any `number`. For example, `deductWalletBalance(userId, -500, ...)` increases the balance by 500 piasters, and fractional / `NaN` inputs will corrupt the ledger. Guard both entry points with `Number.isSafeInteger(amountPiasters) && amountPiasters > 0` before calculating the next balance.
  >
  > <details>
  > <summary>Minimal fix</summary>
  >
  > ```diff
  >  export function topUpWallet(
  >    userId: string,
  >    amountPiasters: number,
  >    description = DEFAULT_TOP_UP_DESCRIPTION,
  >    reference?: { reference_id?: string; reference_type?: string },
  >  ): StoredWalletState {
  > +  if (!Number.isSafeInteger(amountPiasters) || amountPiasters <= 0) {
  > +    throw new Error('amountPiasters must be a positive integer');
  > +  }
  > +
  >    const current = readState(userId);
  >    const transaction = buildTransaction('credit', amountPiasters, description, reference);
  >    const nextBalance = current.wallet.balance + amountPiasters;
  > @@
  >  export function deductWalletBalance(
  >    userId: string,
  >    amountPiasters: number,
  >    description: string,
  >    reference?: { reference_id?: string; reference_type?: string },
  >  ): StoredWalletState {
  > +  if (!Number.isSafeInteger(amountPiasters) || amountPiasters <= 0) {
  > +    throw new Error('amountPiasters must be a positive integer');
  > +  }
  > +
  >    const current = readState(userId);
  > ```
  > </details>
  >
  >
  > As per coding guidelines "NEVER use `float` or `decimal` for monetary values in code or database — always use integer piasters".
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/lib/wallet-store.ts` around lines 100 - 138, Both topUpWallet
  > and deductWalletBalance accept any number for amountPiasters which allows
  > negative, fractional or NaN values to corrupt balances; validate amountPiasters
  > at the start of each exported function using a guard like
  > Number.isSafeInteger(amountPiasters) && amountPiasters > 0 and throw a clear
  > error (e.g., "invalid amountPiasters") if the check fails so subsequent math
  > (nextBalance) only runs with positive integer piasters.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:a7649d83-0bcf-4b9f-8799-e35d6313609d -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Don't collapse query failures into empty inquiry states on dashboards — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMST -->
  > **apps/web/src/pages/roles/InvestorDashboard.tsx:147**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Don't collapse query failures into empty inquiry states.**
  >
  > Both panels fall through to "no inquiries" when their queries error, so a backend failure is indistinguishable from a genuinely empty inbox/history. That can hide missed investment leads from both sides. Add explicit `isError` handling for `applicationsQuery` and `myInterests` before the `length === 0` checks.
  >
  >
  >
  > Also applies to: 211-220
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/roles/InvestorDashboard.tsx` around lines 138 - 147, The
  > current render collapses query errors into the "no inquiries" state; update the
  > JSX around applicationsQuery and myInterests to check .isError (e.g.,
  > applicationsQuery.isError and myInterests.isError) before falling back to
  > receivedApplications.length === 0 or similar checks and render an explicit error
  > message/UI when isError is true (instead of the empty-state paragraph or
  > Skeleton). Locate the conditional blocks that reference applicationsQuery,
  > myInterests, receivedApplications and Skeleton and add the isError branches so
  > backend failures show a distinct error row/paragraph (include any relevant error
  > message from the query.error if available) prior to the empty-list handling.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:27c20fd1-bd48-46af-a034-402d87149c99 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Prevent duplicate save requests on rapid clicks in MerchantDashboard — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMSX -->
  > **apps/web/src/pages/roles/MerchantDashboard.tsx:129**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Prevent duplicate save requests on rapid clicks.**
  >
  > `setSaving(true)` does not disable the button until the next render, so a fast double-click can fire two `listingsAPI.create/update` calls before the control locks. Add a synchronous in-flight guard before the API call.
  >
  >
  >
  > Also applies to: 314-316
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/roles/MerchantDashboard.tsx` around lines 91 - 129,
  > handleSaveListing can trigger duplicate API calls because setSaving(true) only
  > takes effect after render; add a synchronous in-flight guard at the top of
  > handleSaveListing to return early if a save is already in progress (use a React
  > ref like isSavingRef or check a saved synchronous flag, set it true immediately
  > before the try block and clear it in finally). Update the function that calls
  > listingsAPI.create/update (handleSaveListing) to check this guard, set the
  > ref/flag synchronously before awaiting the API, and clear it in finally; apply
  > the same guard pattern to the other save handler in this file that also calls
  > listingsAPI.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:58f1f35b-039f-4018-85d5-a57fc49b8ea5 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Block re-entry before deducting from wallet in GuideBookingPage — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMSe -->
  > **apps/web/src/pages/tourism/GuideBookingPage.tsx:101**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Block re-entry before deducting from the wallet.**
  >
  > `deductWalletBalance()` runs before the confirm button is actually disabled, so two quick clicks can charge the wallet twice and dispatch duplicate booking mutations. Add a synchronous in-flight guard/ref at the top of `handleConfirm`.
  >
  >
  >
  > Also applies to: 401-404
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/tourism/GuideBookingPage.tsx` around lines 78 - 101, The
  > handleConfirm function can be re-entered causing duplicate deductWalletBalance
  > and createBooking.mutate calls; add a synchronous in-flight guard (e.g., a ref
  > like isProcessingRef or boolean state isSubmitting) checked at the top of
  > handleConfirm and set to true immediately when entering, and set back to false
  > in all exit paths (success, error, or early returns); specifically update
  > handleConfirm to return early if isProcessingRef.current/isSubmitting is true,
  > set it true before calling deductWalletBalance(pkg.id, ...) and
  > createBooking.mutate, and ensure it is cleared when the mutation completes or on
  > catch so duplicate clicks are prevented and the confirm button can be disabled
  > based on that guard.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:58f1f35b-039f-4018-85d5-a57fc49b8ea5 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Only say refund succeeded when it actually did in GuideBookingPage — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMSg -->
  > **apps/web/src/pages/tourism/GuideBookingPage.tsx:129**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Only say the refund succeeded when it actually did.**
  >
  > The `topUpWallet()` failure path is swallowed, but the toast always tells the user the amount was restored. If that write fails, the wallet stays inconsistent while the UI reports success.
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/tourism/GuideBookingPage.tsx` around lines 115 - 129, The
  > onError handler currently swallows topUpWallet failures but always tells the
  > user the refund succeeded; change onError to perform the refund reliably by
  > awaiting topUpWallet (or handling its returned promise) and capturing its
  > success/failure before showing the toast: call topUpWallet(user.id, totalPrice,
  > `استرداد حجز باقة سياحية: ${pkg.titleAr}`, { reference_id: pkg.id,
  > reference_type: 'package_booking_refund' }) inside a try/catch (or use
  > .then/.catch) and only show the "amount restored" toast when that call actually
  > succeeds, otherwise log/report the topUpWallet error and show a distinct error
  > toast indicating the refund failed; keep use of user.id, totalPrice, pkg.id and
  > pkg.titleAr to locate the call.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:58f1f35b-039f-4018-85d5-a57fc49b8ea5 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] Build shared packages before `pnpm test` — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54HMSj -->
  > **package.json:19**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Build shared packages before `pnpm test`.**
  >
  > `test` now skips the `build:shared` step, so service test runs can pick up stale or missing outputs from `@hena-wadeena/types` and `@hena-wadeena/nest-common`. Keep the same prebuild step you already require for `typecheck`.
  >
  > <details>
  > <summary>Minimal fix</summary>
  >
  > ```diff
  > -    "test": "pnpm run test:workspaces",
  > +    "test": "pnpm run build:shared && pnpm run test:workspaces",
  > ```
  > </details>
  >
  >
  > Based on learnings "Build shared packages (`hena-wadeena/types`, `hena-wadeena/nest-common`) before running individual services".
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@package.json` at line 19, The "test" npm script dropped the prebuild step so
  > service tests may run against stale/missing outputs; restore running the shared
  > packages build before tests by updating the "test" script to run "pnpm run
  > build:shared" (the same prebuild used by "typecheck") before "pnpm run
  > test:workspaces" so shared packages like `@hena-wadeena/types` and
  > `@hena-wadeena/nest-common` are built prior to test execution.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:a7649d83-0bcf-4b9f-8799-e35d6313609d -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

## Not Worth Fixing

- [x] ~~`.eslintcache` committed to repository — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMR- -->
  - _Reason: Already fixed — file removed from git tracking (`git rm --cached`) and `.eslintcache` added to `.gitignore` in commit dd23835. Bot is reviewing stale diff._
  > **apps/web/.eslintcache:1**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Remove committed ESLint cache artifact from the PR.**
  >
  > `apps/web/.eslintcache` is generated, machine-specific state (includes absolute local paths) and should not be versioned. Keeping it in git causes noisy diffs, cross-machine churn, and leaks local environment details.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > - apps/web/.eslintcache
  > ```
  >
  > ```diff
  > +.eslintcache
  > +**/.eslintcache
  > ```
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/.eslintcache` at line 1, The commit includes a generated ESLint
  > cache file (.eslintcache) that contains machine-specific absolute paths
  > (apps/web/.eslintcache) and must be removed; delete the file from the repo (git
  > rm --cached apps/web/.eslintcache or remove and commit), add
  > apps/web/.eslintcache to .gitignore to prevent re-committing, and create a
  > follow-up commit that removes the file from history if necessary (or ask for
  > help with a history rewrite); verify by running git status to ensure only
  > intended changes remain.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:44b2f2d1-b70c-4303-9f77-ee03e4f17600 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] ~~Wallet localStorage as source of truth security concern — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMSF -->
  - _Reason: Client-side wallet is intentional for this hackathon demo. There's no backend wallet service to integrate with. Migrating to server-authoritative wallet is an architectural change out of scope for this PR._
  > **apps/web/src/lib/wallet-store.ts:57**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **Do not make the browser the source of truth for wallet balance.**
  >
  > These helpers read, mutate, and persist the balance entirely in `localStorage`. Any user can edit the stored JSON or call `topUpWallet()` / `deductWalletBalance()` from DevTools to mint funds and bypass any client-side payment gate wired to this store. Wallet debits/credits need to happen on an authenticated backend endpoint; `localStorage` is only safe as a cache of server-issued state.
  >
  >
  >
  > Also applies to: 96-138
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/lib/wallet-store.ts` around lines 28 - 57, The helpers readState
  > and writeState currently treat localStorage as the source of truth for
  > wallet.balance (and functions like topUpWallet() / deductWalletBalance() can
  > mutate it client-side); change the flow so localStorage is only a cache of
  > server-authoritative state: stop performing client-only balance mutations in
  > writeState/readState, fetch and persist only the wallet object returned from
  > authenticated backend endpoints (e.g., POST /wallet/top-up, POST /wallet/deduct
  > or GET /wallet) and update the cache from those server responses, and change
  > topUpWallet/deductWalletBalance to call those endpoints and refresh the local
  > cache on success (optionally support optimistic UI but always reconcile with the
  > server response). Ensure readState returns createInitialState when no valid
  > server-backed cached data exists, and keep recent_transactions/transactions
  > trimming in writeState but do not derive or change balance locally without
  > server validation.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:a7649d83-0bcf-4b9f-8799-e35d6313609d -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] ~~Reject zero/invalid proposed amounts before API call — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMSS -->
  - _Reason: Nice-to-have client validation. Backend already validates input. Low priority for this PR._
  > **apps/web/src/pages/investment/ContactPage.tsx:101**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Reject zero/invalid proposed amounts before calling the API.**
  >
  > `amountProposed` is forwarded unchecked, so `0` (and any non-finite parse result the helper doesn't normalize to `null`) will still be submitted. For an optional proposed amount, non-positive values should be rejected or omitted client-side instead of producing a bad request or a meaningless proposal.
  >
  > <details>
  > <summary>🔎 Suggested guard</summary>
  >
  > ```diff
  >        const amountProposed = formData.amount.trim()
  >          ? parseEgpInputToPiasters(formData.amount)
  >          : null;
  > +      if (
  > +        amountProposed != null &&
  > +        (!Number.isFinite(amountProposed) || amountProposed <= 0)
  > +      ) {
  > +        toast.error('أدخل قيمة مقترحة صحيحة');
  > +        return;
  > +      }
  >        const enrichedMessage = [
  >          `الاسم: ${formData.name.trim()}`,
  > ```
  >
  > ```diff
  > -                    min="0"
  > +                    min="0.01"
  > ```
  > </details>
  >
  >
  > Also applies to: 250-261
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/investment/ContactPage.tsx` around lines 84 - 101, The
  > code currently forwards amountProposed (computed from formData.amount via
  > parseEgpInputToPiasters) directly to investmentApplicationsAPI.submitInterest,
  > allowing 0 or non-finite values to be submitted; update the logic that computes
  > amountProposed to validate the parsed value is a finite positive integer (>0)
  > and otherwise set amountProposed to undefined (or surface a client validation
  > error) before calling submitInterest; ensure you reference the same
  > variables/functions (formData.amount, parseEgpInputToPiasters, amountProposed,
  > investmentApplicationsAPI.submitInterest) and apply the same guard where similar
  > submission happens (also lines ~250-261).
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:27c20fd1-bd48-46af-a034-402d87149c99 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] ~~Check for clipboard support before using it — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMSa -->
  - _Reason: Minor edge case for older browsers. Clipboard API is widely supported, and the existing `.catch()` handles errors. Not blocking._
  > **apps/web/src/pages/tourism/AccommodationInquiryPage.tsx:123**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Check for clipboard support before using it.**
  >
  > When `navigator.clipboard` is unavailable, `navigator.clipboard.writeText(...)` throws before the promise chain runs, so this fallback fails without showing the intended toast.
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/tourism/AccommodationInquiryPage.tsx` around lines 115 -
  > 123, The copy-to-clipboard call can throw synchronously if navigator.clipboard
  > is undefined; before calling navigator.clipboard.writeText(inquiryMessage) in
  > the copy handler, guard for clipboard support (e.g., check if
  > navigator.clipboard && typeof navigator.clipboard.writeText === 'function'), and
  > if absent call toast.error(...) immediately; otherwise call
  > writeText(inquiryMessage).then(() => toast.success(...)).catch(() =>
  > toast.error(...)); alternatively use async/await with try/catch around await
  > navigator.clipboard.writeText(inquiryMessage) to handle runtime failures
  > gracefully.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:58f1f35b-039f-4018-85d5-a57fc49b8ea5 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] ~~Paginate `GET /investments/mine` endpoint — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMSk -->
  - _Reason: Feature request for API consistency. Out of scope for this PR which focuses on frontend missing features. Hackathon data volume doesn't require pagination._
  > **services/market/src/investment-opportunities/investment-opportunities.controller.ts:65**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Paginate `GET /investments/mine`.**
  >
  > This adds a collection endpoint with no `offset/limit`, so the payload grows with the caller's full history and the contract no longer matches the other list endpoints in this module. Please take `@Query() query: QueryOpportunitiesDto` and return a paginated shape here too.
  >
  > As per coding guidelines "Use `PaginatedResponse<T>` from `@hena-wadeena/types` for paginated API responses with offset/limit pattern".
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In
  > `@services/market/src/investment-opportunities/investment-opportunities.controller.ts`
  > around lines 61 - 65, The findMine controller currently returns an unpaginated
  > collection; update the method signature to accept pagination query params by
  > adding `@Query`() query: QueryOpportunitiesDto and change the return to a
  > paginated shape using PaginatedResponse<OpportunityDto> (or the module's
  > opportunity DTO) and have it call opportunitiesService.findMine(user.sub, query)
  > so the service can apply offset/limit; ensure imports include
  > QueryOpportunitiesDto and PaginatedResponse from their packages and adjust
  > opportunitiesService.findMine to accept the query parameter and return the
  > PaginatedResponse.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:a7649d83-0bcf-4b9f-8799-e35d6313609d -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] ~~Paginate `/listings/mine` controller endpoint — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMSl -->
  - _Reason: Same as above — feature request for API consistency, out of scope for this PR._
  > **services/market/src/listings/listings.controller.ts:57**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **`/listings/mine` should expose offset/limit pagination.**
  >
  > This new route currently returns "mine" without pagination inputs, which risks unbounded payloads and breaks the project's pagination contract for controller/service endpoints.
  >
  > <details>
  > <summary>Proposed controller adjustment</summary>
  >
  > ```diff
  >  `@Get`('mine')
  >  `@Roles`(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  > -findMine(`@CurrentUser`() user: JwtPayload) {
  > -  return this.listingsService.findMine(user.sub);
  > +findMine(`@CurrentUser`() user: JwtPayload, `@Query`() query: QueryListingsDto) {
  > +  return this.listingsService.findMine(user.sub, query);
  >  }
  > ```
  > </details>
  >
  > Also align return typing with `PaginatedResponse<T>` in controller/service contracts.  
  >
  > As per coding guidelines, "`**/*.{service,controller}.ts`: Use offset/limit pagination with `PaginatedResponse<T>` from `@hena-wadeena/types`".
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@services/market/src/listings/listings.controller.ts` around lines 53 - 57,
  > The findMine controller currently returns unpaginated results; update the
  > controller method signature (findMine) to accept offset/limit via `@Query` (e.g.,
  > offset:number, limit:number or a PaginationQuery DTO) and call
  > listingsService.findMine(user.sub, offset, limit) so the service receives
  > pagination parameters; change the controller return type to
  > Promise<PaginatedResponse<ListingDto>> (import PaginatedResponse from
  > `@hena-wadeena/types` and the Listing DTO type) and ensure
  > listingsService.findMine is updated to accept and honor (offset, limit) and
  > return a PaginatedResponse<T> as well.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:poseidon:hawk:61df3829-b2e7-49a9-8977-e8260152e675 -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [x] ~~Paginate `findMine()` in listings service — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54HMSn -->
  - _Reason: Same as above — feature request for API consistency, out of scope for this PR._
  > **services/market/src/listings/listings.service.ts:246**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Paginate `findMine()` instead of returning every row.**
  >
  > This owner-specific query has no `offset/limit`, so it becomes unbounded as data grows and diverges from the repo's standard collection contract. Please switch it to `PaginatedResponse<Listing>` and reuse `paginate(...)` here.
  >
  > As per coding guidelines "Use offset/limit pagination with `PaginatedResponse<T>` from `@hena-wadeena/types`".
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@services/market/src/listings/listings.service.ts` around lines 240 - 246,
  > Change findMine to return a PaginatedResponse<Listing> and use the existing
  > paginate(...) helper instead of returning all rows: update the async function
  > signature from findMine(ownerId: string): Promise<Listing[]> to
  > Promise<PaginatedResponse<Listing>>, build the same query using listingColumns
  > and listings with the where clause (and(eq(listings.ownerId, ownerId),
  > isNull(listings.deletedAt))) and pass that query into paginate(...) along with
  > offset/limit parameters (or a params object) so the result follows the repo's
  > offset/limit pagination contract; ensure callers are adapted to the new
  > PaginatedResponse<Listing> return type.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper:a7649d83-0bcf-4b9f-8799-e35d6313609d -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->
