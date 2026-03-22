# PR #32 — feat: role dashboard wiring

> Generated: 2026-03-22 | Branch: feat/role-dashboard-wiring | Last updated: 2026-03-22 15:30

## Worth Fixing

- [x] Opportunity status shows raw English string for non-active statuses in Arabic UI — @gemini-code-assist, @coderabbitai <!-- thread:PRRT_kwDORjaF4M519NLU --> <!-- thread:PRRT_kwDORjaF4M51-gru -->
  > **apps/web/src/pages/roles/InvestorDashboard.tsx:98**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > This status handling is brittle. It only explicitly handles the 'active' status, and for other statuses, it falls back to displaying the raw status string which may not be user-friendly or localized. It's better to use a status-to-label/variant mapping object, similar to the pattern used in other dashboard components (e.g., `bookingStatusLabels`). This makes the component more robust and easier to maintain as new statuses are added.

  > **apps/web/src/pages/roles/InvestorDashboard.tsx:99**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Raw status string displayed for non-active opportunities.**
  >
  > Non-active statuses show the raw `opp.status` value (e.g., `'closed'`, `'pending'`) directly in the Arabic UI. Other dashboards in this PR use label mappings for all statuses.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > +const opportunityStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  > +  active: { label: 'نشط', variant: 'default' },
  > +  closed: { label: 'مغلق', variant: 'outline' },
  > +  pending: { label: 'قيد المراجعة', variant: 'secondary' },
  > +};
  >
  > // Then in the render:
  > -                    <Badge variant={opp.status === 'active' ? 'default' : 'secondary'}>
  > -                      {opp.status === 'active' ? 'نشط' : opp.status}
  > -                    </Badge>
  > +                    {(() => {
  > +                      const st = opportunityStatusLabels[opp.status] ?? { label: opp.status, variant: 'outline' as const };
  > +                      return <Badge variant={st.variant}>{st.label}</Badge>;
  > +                    })()}
  > ```
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/roles/InvestorDashboard.tsx` around lines 95 - 99, The
  > cell currently renders the raw opp.status string in the Badge, which shows
  > untranslated/internal values; update the rendering to use the shared status
  > label mapping (e.g., the STATUS_LABELS or getStatusLabel function used in other
  > dashboards) so non-active statuses display localized/pretty labels; also keep
  > the Badge variant logic using opp.status === 'active' but pass
  > STATUS_LABELS[opp.status] (or getStatusLabel(opp.status)) instead of opp.status
  > to the Badge content so all statuses use the consistent label mapping.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->

- [x] `limit` and `offset` truthy checks drop valid `0` values — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51-grx -->
  > **apps/web/src/services/api.ts:283**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **`limit` and `offset` currently drop valid `0` values.**
  >
  > Line 282 and Line 283 use truthy checks; passing `0` won't be serialized. Use nullish checks so explicit zero is preserved.
  >
  >
  >
  > <details>
  > <summary>Proposed fix</summary>
  >
  > ```diff
  > -    if (params?.limit) qs.set('limit', String(params.limit));
  > -    if (params?.offset) qs.set('offset', String(params.offset));
  > +    if (params?.limit != null) qs.set('limit', String(params.limit));
  > +    if (params?.offset != null) qs.set('offset', String(params.offset));
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
  >     if (params?.limit != null) qs.set('limit', String(params.limit));
  >     if (params?.offset != null) qs.set('offset', String(params.offset));
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
  > In `@apps/web/src/services/api.ts` around lines 282 - 283, The code currently uses
  > truthy checks that drop valid zero values for params.limit and params.offset;
  > change both conditions to explicit nullish checks so 0 is preserved — replace
  > "if (params?.limit)" and "if (params?.offset)" with checks like "if
  > (params?.limit !== undefined && params.limit !== null)" and "if (params?.offset
  > !== undefined && params.offset !== null)" before calling qs.set('limit',
  > String(params.limit)) and qs.set('offset', String(params.offset)).
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:poseidon:hawk -->

## Not Worth Fixing

- [ ] ~~Import `Link` from `react-router-dom` instead of `react-router` — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M519NLQ --> <!-- thread:PRRT_kwDORjaF4M519NLT -->
  - _Reason: In React Router v7, `react-router` is the correct canonical package — `react-router-dom` re-exports from it. Both work identically. This is a convention nitpick with no functional impact._
  > **apps/web/src/components/dashboard/EmptyState.tsx:3**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > For web applications, it's standard practice to import components like `Link` from `react-router-dom` rather than `react-router`. The `react-router-dom` package provides the necessary DOM bindings for web environments, and using it directly ensures clarity and alignment with the React ecosystem's conventions.
  >
  > ```suggestion
  > import { Link } from 'react-router-dom';
  > ```

  > **apps/web/src/pages/roles/InvestorDashboard.tsx:2**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > For web applications, it's standard practice to import components like `Link` from `react-router-dom` rather than `react-router`. The `react-router-dom` package provides the necessary DOM bindings for web environments. Using it consistently improves code clarity and maintainability.
  >
  > ```suggestion
  > import { Link } from 'react-router-dom';
  > ```

- [ ] ~~Fallback to 'pending' label for unknown merchant verification statuses — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51-grw -->
  - _Reason: The verification statuses come from our own enum — unexpected values are a hypothetical scenario. The current fallback to "pending" is reasonable defensive coding. Not worth the added complexity for a case that can't happen with our API._
  > **apps/web/src/pages/roles/MerchantDashboard.tsx:95**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Fallback to 'pending' label for unknown statuses may be misleading.**
  >
  > If `biz.verificationStatus` contains an unexpected value (e.g., a new status added by the API, or a typo in data), the fallback silently displays "قيد المراجعة" (pending). This could mislead merchants about their actual status.
  >
  > Consider logging unknown statuses or rendering them distinctly:
  >
  > <details>
  > <summary>Suggested approach</summary>
  >
  > ```diff
  > -                  const st =
  > -                    verificationLabels[biz.verificationStatus] ?? verificationLabels.pending;
  > +                  const st = verificationLabels[biz.verificationStatus] ?? {
  > +                    label: biz.verificationStatus,
  > +                    variant: 'outline' as const,
  > +                  };
  > ```
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@apps/web/src/pages/roles/MerchantDashboard.tsx` around lines 93 - 95, The
  > current fallback silently maps unknown biz.verificationStatus values to
  > verificationLabels.pending inside the businesses.map callback, which can mislead
  > merchants; update the logic where st is computed (in the businesses.map block
  > using verificationLabels and biz.verificationStatus) to detect when
  > verificationLabels[biz.verificationStatus] is undefined, log or warn the
  > unexpected status (e.g., console.warn or a telemetry logger) including biz.id
  > and the raw status, and render a distinct fallback label (for example "Unknown
  > status: {biz.verificationStatus}" or a localized "غير معروف") instead of
  > defaulting to the pending label so unknown statuses are visible to users and
  > traceable in logs.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:ocelot -->
