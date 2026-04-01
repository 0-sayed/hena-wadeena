# PR Code Review — Issues Resolution Guide

> **Source:** Automated review comments from `gemini-code-assist`, `cubic-dev-ai`, `devin-ai`, and `chatgpt-codex`.
> **Commit reviewed:** `a47fa141cb`
> **Purpose:** Actionable fix guide for each flagged issue, ordered by priority.

---

## Master Checklist

- [ ] **P1-A** — Refresh token stored in `localStorage` (XSS vulnerability)
- [ ] **P1-B** — `logoUrl` validation blocks edits on existing businesses with relative paths
- [ ] **P2-A** — Unbounded public endpoint `GET /users/public` — no ID limit
- [ ] **P2-B** — No UUID validation before DB query in `findPublicProfiles`
- [ ] **P2-C** — `ml-2` on icon inside Button with `gap-2` — asymmetric padding
- [ ] **P2-D** — `logoUrl` schema: HTTP URLs not fully validated (only scheme prefix checked)
- [ ] **P2-E** — Supplier search has no debounce — fires request on every keystroke
- [ ] **P2-F** — `<Button>` nested inside `<Link>` — invalid HTML (`<a>` wrapping `<button>`)
- [ ] **P2-G** — Sidebar footer links missing `onClick` to close sidebar on mobile
- [ ] **P2-H** — Admin sees broken role-dashboard links they cannot access (route guard mismatch)
- [ ] **P3-A** — Redundant condition in `isAccommodationPath` in `Header.tsx`
- [ ] **PERF-A** — `await queryClient.invalidateQueries(...)` in `LocalTransportTab.tsx`
- [ ] **PERF-B** — `await queryClient.invalidateQueries(...)` in `MarketplacePage.tsx`
- [ ] **PERF-C** — Multiple specific invalidation calls in `AdminCrops.tsx` — use broad prefix instead

---

## P1 Issues — Critical (Fix Immediately)

---

### P1-A — Refresh Token Stored in `localStorage` (XSS Risk)

**File:** `apps/web/src/services/auth-manager.ts` — Line 23

**Root Cause:**
The refresh token is now persisted to `localStorage` (introduced in this PR). The prior design kept it in-memory only. `localStorage` is accessible to any JavaScript running on the page — including injected scripts from XSS attacks — making token theft trivially easy.

**Options (choose one):**

#### Option 1 — Preferred: `httpOnly` Cookie (Backend Change Required)
- Have the backend set the refresh token as an `httpOnly`, `SameSite=Strict` cookie on login.
- The cookie is never accessible to JavaScript.
- On token refresh, the browser automatically sends the cookie — no JS handling needed.
- Remove all `localStorage.setItem(REFRESH_TOKEN_KEY, ...)` and `localStorage.getItem(REFRESH_TOKEN_KEY)` calls from the frontend.

#### Option 2 — Fallback: `sessionStorage` (Frontend-only, reduced exposure)
- Replace `localStorage` with `sessionStorage` for the refresh token only.
- `sessionStorage` is scoped to the tab lifetime — closes on tab close, less persistent but still JS-accessible.
- **Not fully secure**, but reduces blast radius compared to `localStorage`.

```ts
// BEFORE
localStorage.setItem(REFRESH_TOKEN_KEY, rt);

// AFTER (Option 2 fallback)
sessionStorage.setItem(REFRESH_TOKEN_KEY, rt);
```

**Acceptance Criteria:**
- [ ] Refresh token is NOT stored in `localStorage`.
- [ ] If using cookies: backend sets `httpOnly` cookie; frontend removes all RT localStorage logic.
- [ ] If using `sessionStorage`: all RT read/write calls updated consistently.
- [ ] Access token (short-lived) may remain in `localStorage` or memory — only RT is the concern.

---

### P1-B — `logoUrl` Validation Breaks Existing Businesses with Relative Paths

**File:** `services/market/src/business-directory/dto/create-business.dto.ts` — Line 25

**Root Cause:**
The new `logoUrl` validation only accepts absolute `http(s)://` URLs or `data:image/` URLs. However, **existing seeded business records** already use relative paths (e.g., `/images/seed/...`). When the transport edit UI re-submits an existing company's `logoUrl` unchanged, it now fails validation with HTTP 400, blocking any field edits on those records.

**Fix:**
Extend the validation to also accept relative paths (strings starting with `/`), or strip/transform relative URLs before validation.

```ts
// BEFORE
logoUrl: z
  .string()
  .refine((value) => /^https?:\/\//i.test(value) || value.startsWith('data:image/'), {
    message: 'logoUrl must be an absolute URL or data URL',
  })
  .optional(),

// AFTER — also allow relative paths
logoUrl: z
  .string()
  .refine(
    (value) =>
      value.startsWith('/') ||                                          // relative path
      value.startsWith('data:image/') ||                               // data URL
      (z.string().url().safeParse(value).success && /^https?:\/\//i.test(value)), // absolute http(s) URL
    {
      message: 'logoUrl must be a relative path, absolute http(s) URL, or data URL',
    },
  )
  .optional(),
```

**Acceptance Criteria:**
- [ ] Editing any existing business record (with relative logo path) succeeds without changing the logo.
- [ ] New businesses can still supply `http(s)://` or `data:image/` URLs.
- [ ] Malformed strings that don't match any pattern are still rejected.

---

## P2 Issues — High Priority

---

### P2-A — Unbounded `GET /users/public` Endpoint

**File:** `services/identity/src/users/users.controller.ts` — Line 54

**Root Cause:**
This public (unauthenticated) endpoint accepts a comma-separated list of IDs with no upper limit. A malicious actor can send thousands of IDs, triggering a massive `IN (...)` DB query, causing performance degradation or denial of service.

**Fix:**
Add a hard limit (e.g., 100 IDs) and return HTTP 400 if exceeded.

```ts
@Public()
@Get('users/public')
async getPublicUsers(@Query('ids') ids?: string) {
  const parsedIds = ids?.split(',').filter(Boolean) ?? [];

  if (parsedIds.length > 100) {
    throw new BadRequestException('Too many IDs requested. Maximum is 100.');
  }

  return this.usersService.findPublicProfiles(parsedIds);
}
```

**Acceptance Criteria:**
- [ ] Requests with more than 100 IDs receive HTTP 400 with a clear error message.
- [ ] Requests with 100 or fewer IDs work as before.
- [ ] Limit constant is defined in a config/constant — not hardcoded inline.

---

### P2-B — No UUID Validation Before DB Query in `findPublicProfiles`

**File:** `services/identity/src/users/users.service.ts`

**Root Cause:**
`findPublicProfiles` passes raw IDs directly into `inArray(users.id, normalizedIds)`. Since the `users.id` column is a UUID type in PostgreSQL, passing a non-UUID string (e.g., `ids=not-a-uuid`) causes a Postgres type error — resulting in an unhandled 500 server error rather than a proper 400 client error.

**Fix:**
Validate each ID is a valid UUID before querying. Reject or silently filter invalid ones.

```ts
import { isUUID } from 'class-validator'; // or use a regex

const validIds = normalizedIds.filter((id) => isUUID(id));

if (validIds.length === 0) {
  return [];
}

// proceed with DB query using validIds only
```

**Acceptance Criteria:**
- [ ] Non-UUID strings in `ids` param do not cause 500 errors.
- [ ] Invalid UUIDs are either rejected (400) or silently filtered before the DB call.
- [ ] Valid UUIDs still resolve correctly.

---

### P2-C — `ml-2` on Icon Inside Button With `gap-2` (Asymmetric Padding)

**File:** `apps/web/src/components/maps/InteractiveMap.tsx` — Line 186

**Root Cause:**
The `Button` component already applies `gap-2` to space flex children. Adding `ml-2` to the icon creates extra left margin only — resulting in uneven spacing between icon and text.

**Fix:**

```tsx
// BEFORE
<ExternalLink className="ml-2 h-4 w-4" />

// AFTER
<ExternalLink className="h-4 w-4" />
```

**Acceptance Criteria:**
- [ ] `ml-2` removed from the `ExternalLink` icon.
- [ ] Visual spacing between icon and "Open in Google Maps" text is even and consistent.

---

### P2-D — `logoUrl` HTTP Validation Only Checks Scheme Prefix

**File:** `services/market/src/business-directory/dto/create-business.dto.ts` — Line 25

> ⚠️ This is partially overlapping with P1-B. Apply both fixes together in one pass.

**Root Cause:**
`/^https?:\/\//i.test(value)` only confirms the string starts with `http://` or `https://` — it does not verify the rest of the URL is well-formed. A value like `https://` alone would pass.

**Fix:**
Use `z.string().url().safeParse(value).success` in addition to the scheme check (already shown in P1-B fix above). This uses Zod's built-in URL validator which calls the WHATWG URL parser internally.

**Acceptance Criteria:**
- [ ] Malformed URLs like `https://` or `http://???` are rejected.
- [ ] Well-formed URLs like `https://example.com/logo.png` are accepted.

---

### P2-E — Supplier Search Missing Debounce

**File:** `apps/web/src/pages/MarketplacePage.tsx` — Line 93

**Root Cause:**
`supplierSearch` state is passed directly as `q` to `useBusinesses(...)`. Every keystroke triggers a new TanStack Query fetch, flooding the API with requests while the user is still typing.

**Fix:**
Debounce the search value before passing it to the query hook.

```tsx
// Option A: useDeferredValue (React built-in, no extra deps)
const deferredSearch = useDeferredValue(supplierSearch);
const { data, ... } = useBusinesses({ q: deferredSearch || undefined });

// Option B: Custom useDebouncedValue hook (300ms delay)
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Usage:
const debouncedSearch = useDebouncedValue(supplierSearch, 300);
const { data, ... } = useBusinesses({ q: debouncedSearch || undefined });
```

**Acceptance Criteria:**
- [ ] API is not called on every keystroke.
- [ ] Search triggers at most after user stops typing (300ms debounce or `useDeferredValue`).
- [ ] Search still works correctly and returns expected results.

---

### P2-F — `<Button>` Nested Inside `<Link>` — Invalid HTML

**File:** `apps/web/src/pages/roles/StudentDashboard.tsx` — Line 57

**Root Cause:**
Wrapping a `<Button>` (renders as `<button>`) inside a `<Link>` (renders as `<a>`) produces `<a><button></button></a>` — invalid HTML per spec. Browsers may handle it unpredictably and it fails accessibility audits.

**Fix:**
Use `Button`'s `asChild` prop so it renders as the `Link`'s underlying `<a>` element directly.

```tsx
// BEFORE
<Link to="/tourism/accommodation">
  <Button variant="outline" size="sm" className="w-full sm:w-auto">
    عرض جميع السكن
  </Button>
</Link>

// AFTER — using asChild
import { Link } from 'react-router-dom';

<Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
  <Link to="/tourism/accommodation">عرض جميع السكن</Link>
</Button>
```

**Acceptance Criteria:**
- [ ] No `<a>` wrapping `<button>` in the rendered HTML.
- [ ] Button navigates to `/tourism/accommodation` correctly.
- [ ] Button styles remain unchanged.

---

### P2-G — Sidebar Footer Links Don't Close Mobile Sidebar

**File:** `apps/web/src/pages/admin/AdminLayout.tsx` — Line 103

**Root Cause:**
The new sidebar footer section (Back to Home, Logout, Profile links) does not call `setSidebarOpen(false)` on click. All other `NavLink` items in the sidebar already do this. On mobile, after clicking a footer link, the sidebar overlay stays open — requiring a manual close.

**Fix:**
Add `onClick={() => setSidebarOpen(false)}` to each footer link and button.

```tsx
// Back to Home link
<Link
  to="/"
  onClick={() => setSidebarOpen(false)}
  className="..."
>
  ...
</Link>

// Logout button
<button
  onClick={() => { setSidebarOpen(false); handleLogout(); }}
  className="..."
>
  ...
</button>

// Profile link
<Link
  to="/admin/profile"
  onClick={() => setSidebarOpen(false)}
  className="..."
>
  ...
</Link>
```

**Acceptance Criteria:**
- [ ] Clicking any footer link/button closes the sidebar on mobile.
- [ ] Navigation still works correctly after sidebar closes.
- [ ] Desktop sidebar is unaffected.

---

### P2-H — Admin Sees Broken Role Dashboard Links (Route Guard Mismatch)

**File:** `apps/web/src/pages/Index.tsx` — Lines 100–110 + `apps/web/src/App.tsx` — Lines 129–153

**Root Cause:**
`filterLinks` returns ALL role links when `role === UserRole.ADMIN`. But `RequireRole` guards on role-specific dashboard routes (e.g., `/guide-dashboard`, `/merchant-dashboard`) only include their respective role — not `UserRole.ADMIN`. So admin clicks a link → `RequireRole` rejects → redirects to `/`. All role links are visible but broken for admin.

**Fix (Preferred — Option 1):**
Return empty array for `roleLinks` when user is admin (admin has no role-specific dashboard):

```ts
// In filterLinks at Index.tsx
if (role === UserRole.ADMIN) {
  return links.filter((link) => !roleLinks.includes(link)); // exclude role dashboards
  // OR simply: return adminLinks; // if admin has its own link set
}
```

**Fix (Alternative — Option 2):**
Add `UserRole.ADMIN` to every role dashboard `RequireRole` guard in `App.tsx`:

```tsx
// BEFORE
<RequireRole roles={[UserRole.GUIDE]}>
  <GuideDashboard />
</RequireRole>

// AFTER
<RequireRole roles={[UserRole.GUIDE, UserRole.ADMIN]}>
  <GuideDashboard />
</RequireRole>
```
Apply to all role routes: GUIDE, MERCHANT, DRIVER, INVESTOR, TOURIST, STUDENT, RESIDENT.

**Acceptance Criteria:**
- [ ] Admin user sees no broken navigation links on the homepage.
- [ ] Either: admin sees no role-specific dashboard links (Option 1), OR admin can access all dashboards (Option 2).
- [ ] Non-admin roles are unaffected.

---

## P3 Issues — Low Priority (Code Quality)

---

### P3-A — Redundant Condition in `isAccommodationPath`

**File:** `apps/web/src/components/layout/Header.tsx` — Line 53

**Root Cause:**
`'/tourism/accommodation-inquiry'` starts with `'/tourism/accommodation'` — so the second condition in the OR is always already covered by the first. It can never be true when the first is false.

**Fix:**

```ts
// BEFORE
const isAccommodationPath = (pathname: string) =>
  pathname.startsWith('/tourism/accommodation') ||
  pathname.startsWith('/tourism/accommodation-inquiry');

// AFTER
const isAccommodationPath = (pathname: string) =>
  pathname.startsWith('/tourism/accommodation');
```

**Acceptance Criteria:**
- [ ] Function simplified to single condition.
- [ ] Active state on accommodation tab still works for `/tourism/accommodation`, `/tourism/accommodation/123`, and `/tourism/accommodation-inquiry`.

---

## Performance Issues

---

### PERF-A — Awaited `invalidateQueries` in `LocalTransportTab.tsx`

**File:** `apps/web/src/components/logistics/LocalTransportTab.tsx`

**Fix:**
```ts
// BEFORE
await queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });

// AFTER
void queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });
```

---

### PERF-B — Awaited `invalidateQueries` in `MarketplacePage.tsx`

**File:** `apps/web/src/pages/MarketplacePage.tsx`

**Fix:**
```ts
// Same pattern as PERF-A
void queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });
```

---

### PERF-C — Multiple Specific Invalidations in `AdminCrops.tsx`

**File:** `apps/web/src/pages/admin/AdminCrops.tsx`

**Root Cause:**
Multiple `invalidateQueries` calls with specific keys are awaited inside `Promise.all`. TanStack Query supports prefix-based invalidation — a single call with a shared prefix invalidates all matching queries in the cache.

**Fix:**
```ts
// BEFORE
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['market', 'commodities'] }),
  queryClient.invalidateQueries({ queryKey: ['market', 'price-index'] }),
  queryClient.invalidateQueries({ queryKey: ['market', 'price-summary'] }),
  selectedCommodityId
    ? queryClient.invalidateQueries({ queryKey: ['market', 'commodities', selectedCommodityId] })
    : Promise.resolve(),
]);

// AFTER — single broad invalidation, fire-and-forget
void queryClient.invalidateQueries({ queryKey: ['market'] });
```

> **Note:** This assumes all `market.*` queries should be refreshed after a crop mutation. If only specific sub-keys should be invalidated, keep them but still use `void` instead of `await`.

**Acceptance Criteria (PERF-A, B, C):**
- [ ] No `await` on any `invalidateQueries` call.
- [ ] UI still refreshes after mutations (invalidation still fires, just not blocking).
- [ ] `AdminCrops.tsx` uses a single broad `['market']` prefix invalidation where appropriate.

---

## Summary Table

| ID | Priority | File | One-line Description |
|---|---|---|---|
| P1-A | 🔴 Critical | `auth-manager.ts` | Refresh token in localStorage — XSS risk |
| P1-B | 🔴 Critical | `create-business.dto.ts` | logoUrl validation breaks existing relative-path records |
| P2-A | 🟠 High | `users.controller.ts` | No ID limit on public endpoint |
| P2-B | 🟠 High | `users.service.ts` | Raw IDs passed to DB without UUID validation |
| P2-C | 🟠 High | `InteractiveMap.tsx` | `ml-2` on icon creates asymmetric padding |
| P2-D | 🟠 High | `create-business.dto.ts` | Incomplete HTTP URL validation |
| P2-E | 🟠 High | `MarketplacePage.tsx` | Search fires API call on every keystroke |
| P2-F | 🟠 High | `StudentDashboard.tsx` | Invalid HTML: `<a>` wrapping `<button>` |
| P2-G | 🟠 High | `AdminLayout.tsx` | Mobile sidebar stays open after footer nav |
| P2-H | 🟠 High | `Index.tsx` + `App.tsx` | Admin sees broken role-dashboard links |
| P3-A | 🟡 Low | `Header.tsx` | Redundant condition in `isAccommodationPath` |
| PERF-A | 🔵 Perf | `LocalTransportTab.tsx` | Awaited cache invalidation delays UI |
| PERF-B | 🔵 Perf | `MarketplacePage.tsx` | Awaited cache invalidation delays UI |
| PERF-C | 🔵 Perf | `AdminCrops.tsx` | Multiple specific invalidations — use broad prefix |

---

*Last updated: 2026-04-01 | Reviewed commit: `a47fa141cb` | Status: Open*
