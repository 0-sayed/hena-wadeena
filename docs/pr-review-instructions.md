# PR Review: Agent Resolution Instructions

> **PR #94** — Platform-integrated inquiry system for startups and property listings.
> All issues below must be resolved. Each section includes the file path, problem description, and the exact fix to apply.

---

## Issue 1 — CRITICAL: Invalid Zod Schema Method

**File:** `services/market/src/business-inquiries/dto/create-business-inquiry.dto.ts`
**Line:** ~6
**Severity:** Critical (runtime crash)
**Source:** Manual review

### Problem
`z.email()` is not a valid Zod method. This will throw a runtime error when the DTO is instantiated.

### Fix
```diff
- contactEmail: z.email().optional(),
+ contactEmail: z.string().email().optional(),
```

---

## Issue 2 — HIGH: Investment Contact Button Visible to All Roles

**File:** `apps/web/src/pages/InvestmentPage.tsx`
**Severity:** High (RBAC violation)
**Source:** Manual review / ISSUE-008 / `docs/superpowers/specs/2026-04-03-rbac-password-slice-design.md`

### Problem
The "Contact" button that navigates to `/investment/contact/:id?entity=startup` is rendered for **all authenticated users**. Per the design spec, it must only be visible to users with `admin` or `investor` roles.

### Fix
Wrap the `<Button>` component in a role guard. Apply a conditional render based on the user's role:

```tsx
// Only render if user role is 'admin' or 'investor'
{['admin', 'investor'].includes(user?.role ?? '') && (
  <Button
    className="flex-1 transition-transform hover:scale-[1.02]"
    onClick={() =>
      void navigate(`/investment/contact/${startup.id}?entity=startup`)
    }
  >
    <Send className="ml-2 h-4 w-4" />
    {pickLocalizedCopy(language, {
      ar: 'تواصل',
      en: 'Contact',
    })}
  </Button>
)}
```

---

## Issue 3 — HIGH: XSS Risk via Unvalidated `window.open` URL

**File:** `apps/web/src/pages/investment/StartupDetailsPage.tsx`
**Line:** ~298
**Severity:** High (security vulnerability)
**Source:** Augment review

### Problem
`startup.website` is user-controlled and passed directly into `window.open()`. This allows dangerous URL schemes like `javascript:` to execute arbitrary code on click.

### Fix
Validate that the URL uses only `http` or `https` before opening it:

```tsx
onClick={() => {
  try {
    const url = new URL(startup.website!);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      window.open(startup.website!, '_blank', 'noopener,noreferrer');
    }
  } catch {
    // Invalid URL — do nothing
  }
}}
```

---

## Issue 4 — MEDIUM: Wrong Role Check on Investment Contact Page

**File:** `apps/web/src/pages/investment/ContactPage.tsx`
**Line:** ~168
**Severity:** Medium (RBAC violation)
**Source:** Manual review + Augment review / ISSUE-008

### Problem
The role guard allows `investor` and `merchant` but **excludes `admin`** and **incorrectly includes `merchant`**. Per ISSUE-008 and the design spec, only `investor` and `admin` should be permitted.

### Fix
```diff
- if (!['investor', 'merchant'].includes(user?.role ?? '')) {
+ if (!['investor', 'admin'].includes(user?.role ?? '')) {
```

---

## Issue 5 — MEDIUM: Wrong Roles on Business Inquiries Controller Endpoints

**File:** `services/market/src/business-inquiries/business-inquiries.controller.ts`
**Lines:** ~`@Get('business-inquiries/mine/received')` decorator, and similarly on `markRead` and `reply` methods
**Severity:** Medium (RBAC violation)
**Source:** Manual review

### Problem
The `@Roles` decorator includes `UserRole.MERCHANT`, which contradicts the design specification. Merchants should not have access to these endpoints.

### Fix
Apply this change to the `received`, `markRead`, and `reply` endpoints:

```diff
- @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.ADMIN)
+ @Roles(UserRole.INVESTOR, UserRole.ADMIN)
```

---

## Issue 6 — HIGH: `read_env` Aborts Deploy on Missing Key

**File:** `.github/workflows/deploy.yml`
**Line:** ~150
**Severity:** High / P1 (deployment failure)
**Source:** Cubic review

### Problem
Under `set -euo pipefail`, `grep` returns exit code 1 when the key is not found in `.env`. This causes the command substitution `$(read_env CADDY_HTTP_PORT)` to kill the script **before** the `:-80` default is applied. Deployments will fail silently even when the port is free.

### Fix
```diff
- grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f 2-
+ grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f 2- || true
```

---

## Issue 7 — HIGH: Heredoc Indentation Causes Spurious Port-Conflict Failures

**File:** `.github/workflows/deploy.yml`
**Line:** ~170
**Severity:** High
**Source:** Augment review

### Problem
The heredoc block feeding `$holders` into the `while` loop is indented. When `$holders` is empty, the loop still receives a whitespace-only line, causing `unexpected_holder_count` to increment spuriously. This makes deployments fail even when the port is free or held by the expected Caddy container.

### Fix
Strip leading whitespace from `$holders` before feeding it into the heredoc, or use a `while read` loop with a process substitution instead:

```bash
while IFS= read -r holder; do
  [ -z "${holder// }" ] && continue
  if [ "${holder%%$'\t'*}" != "$expected_container" ]; then
    unexpected_holder_count=$((unexpected_holder_count + 1))
  fi
done <<EOF
$holders
EOF
```

Alternatively, refactor to avoid the heredoc entirely:

```bash
while IFS= read -r holder; do
  [ -z "$holder" ] && continue
  if [ "${holder%%$'\t'*}" != "$expected_container" ]; then
    unexpected_holder_count=$((unexpected_holder_count + 1))
  fi
done < <(printf '%s\n' "$holders")
```

---

## Issue 8 — MEDIUM: Stat Card Shows `0` During Business Loading

**File:** `apps/web/src/pages/roles/InvestorDashboard.tsx`
**Line:** ~140
**Severity:** Medium / P2 (UX bug)
**Source:** Cubic review

### Problem
`useBusinessInquiriesReceived` is disabled until businesses finish loading, so `loadingStartupInquiries` is `false` during that window. The stat card briefly shows `0` instead of a loading indicator.

### Fix
```diff
- value={loadingStartupInquiries ? '...' : stats.startupInquiries}
+ value={loadingBusinesses || loadingStartupInquiries ? '...' : stats.startupInquiries}
```

---

## Issue 9 — MEDIUM: Type Mismatch on `businessInquiriesAPI.submit` Return

**File:** `apps/web/src/services/api.ts`
**Line:** ~681
**Severity:** Medium / P2 (type safety / runtime undefined fields)
**Source:** Augment review + Cubic review

### Problem
`businessInquiriesAPI.submit` is typed as returning the enriched `BusinessInquiry` shape (which requires `businessName` and `businessOwnerId`), but the backend POST endpoint returns the raw inquiry row without those joined fields. This causes `undefined` fields at runtime.

### Fix
Introduce a dedicated submit-response type and use it:

```ts
// Define a lean type for the raw POST response
export interface CreatedBusinessInquiry {
  id: string;
  businessId: string;
  contactName: string;
  contactEmail?: string;
  // ... other raw fields returned by the backend
  createdAt: string;
}

// Update the API method
export const businessInquiriesAPI = {
  submit: (businessId: string, body: CreateBusinessInquiryRequest) =>
    apiFetchWithRefresh<CreatedBusinessInquiry>(`/businesses/${businessId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  // ...
};
```

---

## Issue 10 — MEDIUM: `getStartups()` Filter Silently Removed

**File:** `apps/web/src/services/api.ts`
**Line:** ~910
**Severity:** Medium / P2 (silent behavioral regression)
**Source:** Cubic review

### Problem
The `?type=startup` query param was removed from `investmentAPI.getStartups()`, making it return **all businesses** — identical to `businessesAPI.getAll()`. If the backend supports this filter, removing it is a regression. If the backend does not support it, the method should be renamed to avoid confusion.

### Fix — Option A (backend supports the filter, restore it):
```diff
- getStartups: () => apiFetchWithRefresh<PaginatedResponse<Startup>>('/businesses'),
+ getStartups: () => apiFetchWithRefresh<PaginatedResponse<Startup>>('/businesses?type=startup'),
```

### Fix — Option B (backend does not support the filter, rename the method):
```diff
- getStartups: () => apiFetchWithRefresh<PaginatedResponse<Startup>>('/businesses'),
+ getBusinesses: () => apiFetchWithRefresh<PaginatedResponse<Startup>>('/businesses'),
```
> Update all call sites accordingly if renaming.

---

## Issue 11 — MEDIUM: Duplicated Select Columns Across Service Methods

**File:** `services/market/src/business-inquiries/business-inquiries.service.ts`
**Line:** ~83
**Severity:** Medium / P2 (maintainability)
**Source:** Cubic review

### Problem
The 16-field select map is duplicated across `findReceived`, `findSent`, and `findInquiryForReceiver`. The two paginated methods are nearly identical (~40 lines each). Any schema change (column rename/add) must be applied to all three copies manually.

### Fix
Extract the select fields into a shared constant and refactor the duplicated pagination logic into a private helper method:

```ts
// At the top of the service file, outside the class
const inquiryRecordColumns = {
  id: businessInquiries.id,
  businessId: businessInquiries.businessId,
  businessName: businessDirectories.nameAr,
  // ... all 16 fields
};

// Inside the service class
private buildInquiryQuery(roleCondition: SQL) {
  return this.db
    .select(inquiryRecordColumns)
    .from(businessInquiries)
    .innerJoin(/* ... */)
    .where(roleCondition);
}
```

Then replace the duplicated blocks in `findReceived`, `findSent`, and `findInquiryForReceiver` with calls to `this.buildInquiryQuery(...)`.

---

## Summary Checklist

| # | Severity | File | Status |
|---|----------|------|--------|
| 1 | 🔴 Critical | `dto/create-business-inquiry.dto.ts` | `z.string().email()` fix |
| 2 | 🔴 High | `InvestmentPage.tsx` | Role-guard Contact button |
| 3 | 🔴 High | `StartupDetailsPage.tsx` | Validate URL scheme before `window.open` |
| 4 | 🟠 Medium | `ContactPage.tsx` | Fix role check to `investor` + `admin` |
| 5 | 🟠 Medium | `business-inquiries.controller.ts` | Remove `MERCHANT` from 3 `@Roles` decorators |
| 6 | 🔴 High | `deploy.yml` (~150) | Add `\|\| true` to `grep` in `read_env` |
| 7 | 🔴 High | `deploy.yml` (~170) | Fix heredoc whitespace in port-check loop |
| 8 | 🟠 Medium | `InvestorDashboard.tsx` | Add `loadingBusinesses` to stat card guard |
| 9 | 🟠 Medium | `api.ts` (~681) | Create `CreatedBusinessInquiry` type for submit |
| 10 | 🟠 Medium | `api.ts` (~910) | Restore `?type=startup` or rename method |
| 11 | 🟡 Low | `business-inquiries.service.ts` | Extract `inquiryRecordColumns` constant |
