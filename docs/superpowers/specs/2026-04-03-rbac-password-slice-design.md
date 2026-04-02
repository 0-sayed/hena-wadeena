# RBAC and Password Recovery Slice Design

## Summary

This document defines the first implementation slice for the technical issues listed in `docs/issues`:

- ISSUE-007: trips create action must only be available to `admin` and `driver`
- ISSUE-008: investment contact action must only be available to `admin` and `investor`
- ISSUE-012: authenticated password change and unauthenticated password reset must be exposed in the web app

The slice intentionally excludes ISSUE-009, ISSUE-010, and ISSUE-011 because they require broader booking, wallet, and rating lifecycle work across multiple services.

## Goals

1. Align ride-creation UI access with the already enforced backend role guard.
2. Tighten investment contact access in both frontend and backend to match the issue requirements.
3. Expose the existing identity-service password APIs through complete frontend flows.
4. Keep the changes small, testable, and isolated from the larger booking and wallet backlog.

## Non-Goals

- No escrow, refund, or provider-credit implementation.
- No booking lifecycle redesign beyond what already exists.
- No new password-reset token/link backend flow; the current OTP-based reset API will be used.
- No dedicated 403 page in this slice.
- No generic provider rating platform redesign in this slice.

## Current State

### ISSUE-007

- The logistics page already hides the ride-creation action behind `CanAccess` with `driver` and `admin`.
- The route `/logistics/create-ride` is already protected by `RequireRole`.
- The backend `POST /carpool` endpoint is already guarded by `@Roles(UserRole.DRIVER, UserRole.ADMIN)`.
- The remaining risk is inconsistency between entry points and the page-level experience if a stale route or direct navigation occurs.

### ISSUE-008

- The investment contact buttons currently render without the issue-defined role restriction.
- `apps/web/src/pages/investment/ContactPage.tsx` currently allows `merchant` in addition to the intended roles.
- `services/market/src/business-inquiries/business-inquiries.controller.ts` allows `merchant`, `investor`, and `admin` for inquiry-related endpoints.

### ISSUE-012

- The identity service already exposes:
  - `POST /api/v1/auth/change-password`
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
- The web app does not yet expose a full self-service password UX from login/profile flows.

## Design

### 1. Ride Creation RBAC Hardening

Affected area:

- `apps/web/src/pages/LogisticsPage.tsx`
- `apps/web/src/pages/logistics/CreateRidePage.tsx`
- `apps/web/src/App.tsx`

Design:

- Keep `driver` and `admin` as the only ride-creator roles.
- Preserve route-level protection in `App.tsx` using `RequireRole`.
- Add page-level defensive behavior in `CreateRidePage.tsx` so unauthorized users who reach the page through stale state or direct navigation do not see a usable form.
- Reuse the same allowed-role definition in UI entry points and page logic to avoid drift.

Expected UX:

- Unauthorized users never see the create button in normal navigation.
- Unauthorized users navigating directly to `/logistics/create-ride` are redirected by the route guard.
- If rendering happens before auth state settles, the page fails closed rather than exposing creation controls.

### 2. Investment Contact RBAC Alignment

Affected area:

- `apps/web/src/pages/InvestmentPage.tsx`
- `apps/web/src/pages/investment/OpportunityDetailsPage.tsx`
- `apps/web/src/pages/investment/ContactPage.tsx`
- `apps/web/src/App.tsx`
- `services/market/src/business-inquiries/business-inquiries.controller.ts`

Design:

- Set the allowed roles to exactly `admin` and `investor`.
- Hide investment contact/inquiry buttons for all other roles.
- Protect `/investment/contact/:id` with frontend role-aware behavior:
  - unauthenticated users are redirected to login
  - authenticated but unauthorized users are redirected away with a clear toast
- Update the market service inquiry controller so unauthorized roles receive `403 Forbidden`.

Expected UX:

- `admin` and `investor` can access the full contact flow.
- `merchant`, `tourist`, `guide`, `driver`, and other roles do not see the contact CTA.
- Deep-link access by unauthorized users fails clearly and safely.

### 3. Password Recovery and Password Change UX

Affected area:

- `apps/web/src/services/api.ts`
- `apps/web/src/pages/auth/LoginPage.tsx`
- `apps/web/src/pages/profile/ProfilePage.tsx`
- new auth pages for forgot/reset password
- `apps/web/src/App.tsx`

Design:

- Extend `authAPI` to call the existing backend password endpoints.
- Add a login-page entry point for password recovery.
- Add a profile-level change-password action for authenticated users.
- Implement the reset flow using the current OTP backend contract instead of inventing a new link-token flow.

Flow details:

- Change password:
  - inputs: current password, new password, confirm new password
  - validates confirmation match before request
  - calls `authAPI.changePassword`
  - updates auth tokens if refreshed tokens are returned
  - shows success/error feedback

- Forgot password:
  - page accepts email
  - calls `authAPI.requestPasswordReset`
  - always shows the generic success message expected by the backend

- Reset password:
  - page accepts email, OTP, new password, confirm new password
  - validates minimum length and confirmation match
  - calls `authAPI.confirmPasswordReset`
  - redirects to login after success, with a success message

Validation rules for this slice:

- Minimum password length: 8 characters
- Confirmation must match
- No stricter frontend-only rule will be added unless the backend contract changes

## Data Flow

### Ride Creation Access

1. Auth context hydrates current user role.
2. Logistics UI checks the allowed ride-creator roles before rendering CTAs.
3. Route guard blocks direct navigation for unauthorized users.
4. Backend remains the final authority for `POST /carpool`.

### Investment Contact Access

1. Auth context exposes the current role.
2. Investment listing/detail pages hide the contact CTA unless role is `admin` or `investor`.
3. Contact page validates access before allowing submission.
4. Backend inquiry endpoints reject unauthorized callers with `403`.

### Password Flows

1. Login page links to forgot-password page.
2. Forgot-password page posts email to request-reset endpoint.
3. Reset page posts email, OTP, and new password to confirm-reset endpoint.
4. Profile page posts current and new password to change-password endpoint.

## Error Handling

- Unauthorized frontend access uses existing redirect behavior rather than introducing a new 403 page.
- Unauthorized in-flow actions show a toast before redirect or early return.
- Password request flow must keep the backend’s generic success response to avoid account enumeration.
- Password form validation errors are shown inline before API submission when possible.
- Backend role mismatches remain enforced as defense in depth.

## Testing Strategy

### Frontend

- Add/update tests for ride-creation access visibility and route behavior.
- Add/update tests for investment contact visibility and unauthorized access behavior.
- Add tests for forgot-password, reset-password, and change-password forms:
  - validation
  - success state
  - failure state

### Backend

- Add/update controller/service tests to confirm business inquiry endpoints reject roles outside `admin` and `investor`.
- Keep ride-creation backend tests unchanged unless a regression is found, because the carpool controller is already correctly guarded.

## Risks

- There is existing work in progress in the repo, including files touching investment pages and API clients. The implementation must avoid overwriting unrelated changes.
- ISSUE-012 acceptance wording mentions reset links, but the real backend currently uses OTP. This slice follows the real backend contract.
- ISSUE-008 narrows access relative to current code by removing `merchant`; any merchant-facing investment workflow that depends on this access will need a separate product decision.

## Acceptance Mapping

### ISSUE-007

- Hide ride creation actions for non-`admin`/non-`driver` roles.
- Enforce direct-route protection for unauthorized users.
- Keep backend `403` behavior via the existing role guard.

### ISSUE-008

- Hide investment contact actions for non-`admin`/non-`investor` roles.
- Block unauthorized direct access to the contact page.
- Enforce backend `403` behavior for unauthorized inquiry requests.

### ISSUE-012

- Add change-password UI to authenticated profile flow.
- Add forgot-password entry point to login page.
- Add reset-password page for OTP confirmation.
- Validate new-password confirmation and surface success/error feedback.
