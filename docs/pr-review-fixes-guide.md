# PR Review Fixes Guide — Batch 3 PR #86

A checklist of every issue raised by Gemini, Devin, Augment, Cubic, and Codex reviews, with the root cause and the exact fix required to pass each check.

---

## 🔴 P1 — Critical / Must Fix Before Merge

---

### 1. Refresh Token Stored in `localStorage` (Security)

**File:** `apps/web/src/services/auth-manager.ts:23`  
**Raised by:** Gemini, Augment, Cubic, Devin

**Root cause:** The PR changed `sessionStorage.setItem` to `localStorage.setItem` for the refresh token. `localStorage` is persistent across browser restarts and readable by any JS on the origin — a single XSS payload can exfiltrate a 15-day-lived refresh token.

**Fix:**

```diff
 export function setTokens(accessToken: string, rt: string): void {
   localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
-  localStorage.setItem(REFRESH_TOKEN_KEY, rt);
-  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
+  sessionStorage.setItem(REFRESH_TOKEN_KEY, rt);
   refreshToken = rt;
 }
```

> **Preferred long-term solution:** Store the refresh token in an `httpOnly` cookie set by the server, which is invisible to JavaScript entirely.

---

### 2. Side Effects Run Even When No User Was Updated

**File:** `services/identity/src/users/users.service.ts:221`  
**Raised by:** Cubic

**Root cause:** `revokeAllUserSessions` and `recordAudit` are called unconditionally before checking whether the DB `UPDATE` actually matched any row. If `rows` is empty (e.g., user not found or already deleted), sessions are still revoked and a phantom audit event is written, then `firstOrThrow` throws.

**Fix:**

```diff
-  await this.sessionService.revokeAllUserSessions(id);
-  await this.recordAudit(adminId, 'password_reset', undefined, undefined, {
-    targetUserId: id,
-    source: 'admin_reset',
-  });
-
-  return firstOrThrow(rows);
+  const updatedUser = firstOrThrow(rows); // throws early if no row matched
+
+  await this.sessionService.revokeAllUserSessions(id);
+  await this.recordAudit(adminId, 'password_reset', undefined, undefined, {
+    targetUserId: id,
+    source: 'admin_reset',
+  });
+
+  return updatedUser;
```

---

## 🟡 P2 — Medium / Must Fix Before Merge

---

### 3. `markReadMutation` Fires Repeatedly Until Cache Refetch Completes

**File:** `apps/web/src/pages/marketplace/ListingInquiriesPage.tsx:84–89`  
**Raised by:** Gemini, Devin, Augment, Cubic

**Root cause:** `markReadMutation` is in the `useEffect` dependency array. When the mutation transitions from `pending → idle`, the object reference changes, re-running the effect. At that point the query cache hasn't refetched yet, so `focusedInquiry.status` is still `'pending'` and `isPending` is `false` — the guard passes and `mutate` is called again. This loops until the refetch updates the cache.

**Fix — use a `ref` to track the already-dispatched `focusId`:**

```diff
+  const markedReadRef = useRef<string | null>(null);

   useEffect(() => {
     if (activeTab !== 'received' || !focusId) return;
+    if (markedReadRef.current === focusId) return;          // already dispatched
     const focusedInquiry = received.find((inquiry) => inquiry.id === focusId);
-    if (!focusedInquiry || focusedInquiry.status !== 'pending' || markReadMutation.isPending) return;
+    if (!focusedInquiry || focusedInquiry.status !== 'pending') return;
+    markedReadRef.current = focusId;                        // lock before mutate
     markReadMutation.mutate(focusId);
-  }, [activeTab, focusId, markReadMutation, received]);
+  }, [activeTab, focusId, received]);                       // remove markReadMutation
```

Also reset the ref whenever `focusId` changes (add to `handleTabChange` or a cleanup):

```ts
// inside the effect or in handleTabChange:
if (markedReadRef.current !== focusId) {
  markedReadRef.current = null;
}
```

---

### 4. Language Preference Not Rolled Back on API Error

**File:** `apps/web/src/contexts/auth-context.tsx:125`  
**Raised by:** Devin, Codex, Cubic

**Root cause:** `setLanguagePreference(normalizedLanguage)` is set optimistically before the API call. On failure, `setUser(previousUser)` reverts user state, but `languagePreference` is never reverted. While the user is logged in, the derived language reads `user.language` (correct), but after logout `user` is `null` and the fallback is the stale `languagePreference` — wrong language persists across page refreshes via `localStorage`.

**Fix:**

```diff
       } catch (error) {
         setUser(previousUser);
+        setLanguagePreference(normalizeLanguage(previousUser.language));
         throw error;
       }
```

---

### 5. Concurrent `setLanguage` Calls Can Race

**File:** `apps/web/src/contexts/auth-context.tsx:125`  
**Raised by:** Cubic

**Root cause:** If the user switches languages twice quickly, a slower first response arriving after the second call will overwrite `user` with stale data (the first language).

**Fix — ignore stale responses using a cancellation flag:**

```ts
const setLanguage = useCallback(async (lang: string) => {
  const normalizedLanguage = normalizeLanguage(lang);
  setLanguagePreference(normalizedLanguage);
  if (!user) return;

  const previousUser = user;
  setUser({ ...user, language: normalizedLanguage });

  let cancelled = false;
  try {
    const updatedUser = await authAPI.updateMe({ language: normalizedLanguage });
    if (!cancelled) setUser(updatedUser);
  } catch (error) {
    if (!cancelled) {
      setUser(previousUser);
      setLanguagePreference(normalizeLanguage(previousUser.language));
    }
    throw error;
  }
  return () => { cancelled = true; };
}, [user]);
```

> Alternatively, use an `AbortController` and cancel the previous in-flight request when a new one starts.

---

### 6. Admin Audit Log Misses Admin-Driven Actions for a User

**File:** `services/identity/src/admin/admin-users.service.ts`  
**Raised by:** Augment

**Root cause:** `findDetail()` queries `auditEvents` with `WHERE userId = <targetUserId>`. However, admin actions (role change, password reset, status change) are recorded with `userId = adminId` and the target stored inside `metadata.targetUserId`. These events are invisible in the detail view.

**Fix — add a second condition to the query:**

```ts
.where(
  or(
    eq(auditEvents.userId, id),
    sql`${auditEvents.metadata}->>'targetUserId' = ${id}`
  )
)
```

---

### 7. Mutation Endpoints Return Raw Row, Missing Denormalized Fields

**File:** `services/market/src/listing-inquiries/listing-inquiries.service.ts:205`  
**Raised by:** Augment

**Root cause:** `markRead` and `reply` return a raw `listing_inquiries` row. The frontend `ListingInquiry` type expects denormalized fields (`listingTitle`, `listingOwnerId`, etc.) that only exist in `SELECT` queries which join against the `listings` table. Mutations returning the bare row cause `undefined` fields and broken optimistic cache updates.

**Fix — after the mutation, re-query with the full join (or return a DTO):**

```ts
async markRead(id: string, ownerId: string): Promise<ListingInquiry> {
  const [row] = await this.db
    .update(listingInquiries)
    .set({ status: 'read', readAt: new Date() })
    .where(and(eq(listingInquiries.id, id), eq(listingInquiries.ownerId, ownerId)))
    .returning({ id: listingInquiries.id });

  // Re-fetch with joins so the full shape is returned
  return this.findOneById(row.id, ownerId);
}
```

---

## 🔵 P3 — Low / Code Quality

---

### 8. Hardcoded Query Key Strings in Mutations

**File:** `apps/web/src/hooks/use-listing-inquiries.ts`  
**Raised by:** Gemini

**Root cause:** `queryClient.invalidateQueries` uses a raw `['market', 'listing-inquiries']` array instead of the centralized `queryKeys` helper, creating a maintenance risk if key shapes change.

**Fix:**

```diff
-  void queryClient.invalidateQueries({ queryKey: ['market', 'listing-inquiries'] });
+  void queryClient.invalidateQueries({ queryKey: queryKeys.market.listingInquiries() });
```

Also add a base key to `query-keys.ts`:

```ts
listingInquiries: () => ['market', 'listing-inquiries'] as const,
listingInquiriesReceived: (filters?) => ['market', 'listing-inquiries', 'received', filters] as const,
listingInquiriesSent: (filters?) => ['market', 'listing-inquiries', 'sent', filters] as const,
```

---

### 9. Notification Deep-Links Only Work for First Page

**File:** `apps/web/src/pages/marketplace/ListingInquiriesPage.tsx`  
**Raised by:** Codex

**Root cause:** Both tabs are hard-coded to `limit: 20`. If a notification links to an inquiry that isn't in the first 20 results, the focus/highlight logic silently fails.

**Fix — when a `focusId` is present, either:**

- Increase the limit dynamically: `limit: focusId ? 100 : 20`
- Or add a dedicated single-inquiry fetch that activates when `focusId` is set and the inquiry isn't found in the current page:

```ts
const focusedInquiry = received.find((i) => i.id === focusId);
const { data: focusedFromServer } = useListingInquiryById(
  !focusedInquiry && focusId ? focusId : undefined
);
```

---

## ✅ Review Pass Checklist

| # | File | Issue | Status |
|---|------|--------|--------|
| 1 | `auth-manager.ts` | Revert refresh token to `sessionStorage` | ⬜ |
| 2 | `users.service.ts` | Guard side effects with `firstOrThrow` check | ⬜ |
| 3 | `ListingInquiriesPage.tsx` | Use `ref` to prevent duplicate `markRead` calls | ⬜ |
| 4 | `auth-context.tsx` | Roll back `languagePreference` on API error | ⬜ |
| 5 | `auth-context.tsx` | Fix race condition in concurrent `setLanguage` | ⬜ |
| 6 | `admin-users.service.ts` | Include `targetUserId` in audit event query | ⬜ |
| 7 | `listing-inquiries.service.ts` | Return full DTO from `markRead`/`reply` | ⬜ |
| 8 | `use-listing-inquiries.ts` | Replace hardcoded query keys with `queryKeys` helper | ⬜ |
| 9 | `ListingInquiriesPage.tsx` | Handle `focusId` beyond first page | ⬜ |
