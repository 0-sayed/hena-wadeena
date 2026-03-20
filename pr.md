# PR #27 — feat: frontend foundation

> Generated: 2026-03-20 | Branch: feat/frontend-foundation | Last updated: 2026-03-20 11:50

## Worth Fixing

- [x] LoginPage bypasses AuthProvider — uses localStorage directly instead of `useAuth()` — @gemini-code-assist, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51sccx --> <!-- thread:PRRT_kwDORjaF4M51se66 -->
  > **apps/web/src/pages/auth/LoginPage.tsx:27**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > To fully adopt the new `AuthProvider`, this component should use the `login` method from the `useAuth` hook instead of calling the API and setting `localStorage` directly. This ensures that the authentication state is managed centrally.
  >
  > You'll need to add `const { login } = useAuth();` at the top of your component.
  >
  > ```suggestion
  >       await login({ email: formData.email, password: formData.password });
  > ```

  > **apps/web/src/pages/auth/LoginPage.tsx:28**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Bypassing `AuthProvider` state can break post-login auth flow.**
  >
  > Line 26 and Line 27 persist auth data directly, but route protection now depends on `useAuth()` state. If provider state is not updated here, users can still be treated as unauthenticated until refresh.
  >
  >
  >
  > <details>
  > <summary>✅ Suggested fix</summary>
  >
  > ```diff
  >  import { toast } from 'sonner';
  >  import { authAPI } from '@/services/api';
  > +import { useAuth } from '@/hooks/use-auth';
  > @@
  >  const LoginPage = () => {
  >    const navigate = useNavigate();
  >    const location = useLocation();
  > +  const { login } = useAuth();
  > @@
  >        const res = await authAPI.login({ email: formData.email, password: formData.password });
  > -      localStorage.setItem('access_token', res.access_token);
  > -      localStorage.setItem('user', JSON.stringify(res.user));
  > +      // Delegate persistence + in-memory auth state to AuthProvider
  > +      login(res.access_token, res.user);
  >        toast.success('تم تسجيل الدخول بنجاح');
  > ```
  > </details>

- [x] RegisterPage bypasses AuthProvider — direct localStorage writes skip context update — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51se6- -->
  > **apps/web/src/pages/auth/RegisterPage.tsx:78**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Auth state bypasses AuthProvider.**
  >
  > Direct `localStorage` writes bypass the `AuthProvider` context. The React auth state won't update until the page reloads (after `navigate('/')`). If any component on the home page reads from `useAuth()` before the context rehydrates, it will show an unauthenticated state briefly.
  >
  > Consider using a `login` function from the auth context to set both localStorage and React state atomically.

- [x] Auth hydration trusts localStorage without server validation — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51se6t -->
  > **apps/web/src/contexts/auth-context.tsx:48**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Don't mark the session authenticated from `localStorage` alone.**
  >
  > Lines 44-46 accept any `access_token` string plus any serialized `user` object as a valid session. That makes the client auth state trivially spoofable until the first protected request fails. Treat `localStorage` as a cache only and confirm the token with `/auth/me` before setting `user`.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >    // Hydrate from localStorage on mount
  >    useEffect(() => {
  > -    const token = localStorage.getItem(STORAGE_KEYS.token);
  > -    const storedUser = getStoredUser();
  > -
  > -    if (token && storedUser) {
  > -      setUser(storedUser);
  > -    }
  > -    setIsLoading(false);
  > +    let cancelled = false;
  > +
  > +    const hydrate = async () => {
  > +      const token = localStorage.getItem(STORAGE_KEYS.token);
  > +
  > +      if (!token) {
  > +        if (!cancelled) setIsLoading(false);
  > +        return;
  > +      }
  > +
  > +      try {
  > +        const currentUser = await authAPI.getMe();
  > +        if (cancelled) return;
  > +        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
  > +        setUser(currentUser);
  > +      } catch {
  > +        localStorage.removeItem(STORAGE_KEYS.token);
  > +        localStorage.removeItem(STORAGE_KEYS.user);
  > +      } finally {
  > +        if (!cancelled) setIsLoading(false);
  > +      }
  > +    };
  > +
  > +    void hydrate();
  > +    return () => {
  > +      cancelled = true;
  > +    };
  >    }, []);
  > ```
  > </details>

- [x] Logout only clears local state — never calls backend `/auth/logout` — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51se6y -->
  > **apps/web/src/contexts/auth-context.tsx:59**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Split local auth clearing from user-initiated logout.**
  >
  > Lines 50-59 only clear local state, so a normal logout never reaches `/auth/logout`. That skips backend-side session revocation/auditing and also forces the 401 callback to reuse the same code path. Keep a local `clearAuth()` helper for unauthorized cleanup, but have explicit logout call the API as well.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > -  const logout = useCallback(() => {
  > +  const clearAuth = useCallback(() => {
  >      localStorage.removeItem(STORAGE_KEYS.token);
  >      localStorage.removeItem(STORAGE_KEYS.user);
  >      setUser(null);
  >    }, []);
  >
  > +  const logout = useCallback(() => {
  > +    void authAPI.logout().catch(() => undefined);
  > +    clearAuth();
  > +  }, [clearAuth]);
  > +
  >    // Register 401 handler
  >    useEffect(() => {
  > -    registerUnauthorizedCallback(logout);
  > -  }, [logout]);
  > +    registerUnauthorizedCallback(clearAuth);
  > +  }, [clearAuth]);
  > ```
  > </details>

- [x] 401 handler returns never-resolving promise — callers hang forever — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51se7A -->
  > **apps/web/src/services/api.ts:40**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Reject 401s instead of parking the promise.**
  >
  > Line 39 leaves every caller awaiting this request forever, so loading flags and `finally` cleanup never run after an expired session. Call the unauthorized callback, then reject normally.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >    if (res.status === 401 && token) {
  >      unauthorizedCallback?.();
  > -    // Return a never-resolving promise so callers don't see a result or error.
  > -    // The page is about to redirect to /login anyway.
  > -    return new Promise<T>(() => {});
  > +    throw new Error('Unauthorized');
  >    }
  > ```
  > </details>

- [x] Category not URL-encoded in `getPOIs` query string — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51se7D -->
  > **apps/web/src/services/api.ts:335**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Encode `category` before building the query string.**
  >
  > Line 334 injects the raw value into the URL. Categories containing spaces, `&`, `?`, or `#` will mutate the request and can fetch the wrong dataset.
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  >  export const mapAPI = {
  >    getPOIs: (category?: string) =>
  > -    apiFetch<{ success: boolean; data: POI[] }>(category ? `/pois?category=${category}` : '/pois'),
  > +    apiFetch<{ success: boolean; data: POI[] }>(
  > +      category ? `/pois?category=${encodeURIComponent(category)}` : '/pois',
  > +    ),
  > ```
  > </details>

- [x] New `moderator`/`reviewer` UserRole values missing from identity DB enum — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51se7J -->
  > **packages/types/src/enums/index.ts:10**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **New shared roles are not persisted by the identity DB enum yet.**
  >
  > `UserRole` now includes `moderator` and `reviewer`, but `services/identity/src/db/enums.ts` still defines `user_role` without those values. Assigning either role will fail at DB write time.
  >
  >
  >
  > <details>
  > <summary>Suggested fix (schema + migration alignment)</summary>
  >
  > ```diff
  > // services/identity/src/db/enums.ts
  >  export const userRoleEnum = identitySchema.enum('user_role', [
  >    'tourist',
  >    'resident',
  >    'merchant',
  >    'guide',
  >    'investor',
  >    'student',
  >    'driver',
  > +  'moderator',
  > +  'reviewer',
  >    'admin',
  >  ]);
  > ```
  >
  > Also add the corresponding PostgreSQL enum migration.
  > </details>

## Not Worth Fixing

- [ ] ~~Type assertion for stored user not validated with Zod/type guard — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M51scc5 -->
  - _Reason: localStorage data is set by our own code. Runtime validation adds complexity without meaningful safety gain at this stage._
  > **apps/web/src/contexts/auth-context.tsx:29**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The `getStoredUser` function uses a type assertion (`as AuthUser`) to cast the object from `localStorage`. This is not type-safe, as the stored data could be malformed, outdated, or tampered with, potentially leading to runtime errors.
  >
  > A more robust approach is to use a validation library (like Zod) or a manual type guard to parse and validate the user object safely. This ensures that the application state is always consistent with the expected `AuthUser` type.
  >
  > For example, a simple check could be:
  > ```typescript
  > try {
  >   const user = JSON.parse(raw);
  >   if (user && typeof user.id === 'string') {
  >     return user as AuthUser;
  >   }
  >   // Optionally, clear the invalid item from localStorage
  >   localStorage.removeItem(STORAGE_KEYS.user);
  >   return null;
  > } catch {
  >   return null;
  > }
  > ```

- [ ] ~~Redundant ALTER TYPE statements across migration files — @gemini-code-assist~~ <!-- thread:PRRT_kwDORjaF4M51scdA -->
  - _Reason: The `IF NOT EXISTS` clauses make these safe. Per project convention, generated migrations are machine-owned and not manually edited._
  > **services/identity/drizzle/20260319231657_add-admin-audit-event-types.sql:4**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > These `ALTER TYPE` statements are redundant with the ones in the preceding migration file (`...20260319231649_narrow_human_fly.sql`). While using `IF NOT EXISTS` prevents errors, having duplicated logic across migration files can be confusing and is a sign of a messy migration history. It would be cleaner to consolidate these changes into a single migration file. Consider removing the `ALTER TYPE` statements from `...narrow_human_fly.sql` and keeping only this safer version, or combining all related changes into one of the files.

- [ ] ~~Date formatting functions don't guard against invalid input — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51se61 -->
  - _Reason: These functions receive dates from our own API responses. Defensive validation at this boundary adds noise without practical benefit._
  > **apps/web/src/lib/dates.ts:31**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Guard invalid dates before formatting to prevent runtime crashes.**
  >
  > Line 19, Line 23, and Line 27 format `new Date(date)` without validation. Invalid inputs can throw and break UI rendering.
  >
  >
  >
  > <details>
  > <summary>✅ Suggested fix</summary>
  >
  > ```diff
  > +function toValidDate(input: Date | string): Date | null {
  > +  const parsed = new Date(input);
  > +  return Number.isNaN(parsed.getTime()) ? null : parsed;
  > +}
  > +
  >  export function formatDate(date: Date | string): string {
  > -  return arabicDateFormatter.format(new Date(date));
  > +  const parsed = toValidDate(date);
  > +  return parsed ? arabicDateFormatter.format(parsed) : '—';
  >  }
  >
  >  export function formatDateTime(date: Date | string): string {
  > -  return arabicDateTimeFormatter.format(new Date(date));
  > +  const parsed = toValidDate(date);
  > +  return parsed ? arabicDateTimeFormatter.format(parsed) : '—';
  >  }
  >
  >  export function formatRelativeTime(date: Date | string): string {
  > -  return formatDistanceToNow(new Date(date), {
  > +  const parsed = toValidDate(date);
  > +  if (!parsed) return '—';
  > +  return formatDistanceToNow(parsed, {
  >      addSuffix: true,
  >      locale: arEG,
  >    });
  >  }
  > ```
  > </details>
