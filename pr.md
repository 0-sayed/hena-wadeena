# PR #66 — feat(seed): add database seed scripts for all four services

> Generated: 2026-03-30 | Branch: feat/seed-data-scripts | Last updated: 2026-03-30 12:50

## Worth Fixing

- [x] Duplicate keys break the build (TS1117) — @coderabbitai <!-- thread:PRRT_kwDORjaF4M53lvhP -->
  > **apps/web/src/lib/format.ts:159**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **Duplicate keys break the build (TS1117).**
  >
  > The enum members `GuideSpecialty.HISTORY`, `ADVENTURE`, and `PHOTOGRAPHY` resolve to `'history'`, `'adventure'`, and `'photography'` respectively—the exact same keys you're adding explicitly below. TypeScript rejects object literals with duplicate property names.
  >
  > Remove the redundant explicit entries that duplicate the enum-keyed ones.

- [x] Investment amounts displayed 100x too large due to missing piasters→EGP conversion — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M53lqFD -->
  > **apps/web/src/pages/InvestmentPage.tsx:149**
  >
  > 🔴 **Investment amounts displayed 100x too large due to missing piasters→EGP conversion**
  >
  > The `InvestmentPage.tsx` divides `opp.minInvestment` and `opp.maxInvestment` by `1_000_000` to display "millions", but per AGENTS.md all monetary values are stored in piasters (1 EGP = 100 piasters). The division should be by `100_000_000` (100 for piasters→EGP, then 1,000,000 for millions).

- [x] README seed credentials table lists wrong admin email — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M53lqF_ -->
  > **scripts/seed/README.md:47**
  >
  > 🟡 **README seed credentials table lists wrong admin email**
  >
  > The README at `scripts/seed/README.md:47` documents `kareem@hena-wadeena.online` as an admin email, but the actual seed data creates `adly@hena-wadeena.online` for the `ADMIN_ADLY` user.

- [x] Type Check failing — CI
  - [x] InvestorDashboard.tsx uses wrong properties on Opportunity type (category→sector, location→area, title→titleAr, roi→expectedReturnPct)

## Not Worth Fixing

- [x] ~~Keep client models nullable where backend is still nullable — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M53lvhW -->
  - _Reason: The seed scripts populate all fields completely. The nullable-vs-required mismatch is a pre-existing API design choice outside this PR's scope._
  > **apps/web/src/services/api.ts:440**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Keep these client models nullable where the backend is still nullable.**
  >
  > `services/market/src/db/schema/investment-opportunities.ts` still allows `area`, `expectedReturnPct`, `paybackPeriodYears`, `incentives`, and `images` to be null.

- [x] ~~Re-register UnifiedSearchModule or remove gateway routing — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M53lvhZ -->
  - _Reason: UnifiedSearchModule was intentionally disabled in commit ccc8f94 ("chore(identity): temporarily disable unified search module"). This is tracked separately and not part of this PR's scope._
  > **services/identity/src/app.module.ts:23**
  >
  > Commenting out `UnifiedSearchModule` removes the `UnifiedSearchController` from the identity service. The gateway still forwards `^/api/v1/search` to identity.
