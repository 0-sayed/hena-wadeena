# ISSUE-012 — Profiles: No Reset / Change Password Feature

## Status
- [x] Resolved in current implementation

## Priority
🔴 High

## Affected Area
All User Profiles — Account Settings / Security Section

## Description
The application now exposes both authenticated password change and unauthenticated password reset flows in the backend and the web app:

- profile page entry point for change password
- visible "Forgot Password?" action on the login page
- password reset request page
- OTP-based reset confirmation page
- confirmation emails after successful password change or password reset
- session invalidation for old access and refresh sessions after password change or reset

## Affected Roles
All roles are affected:
- Tourist
- Driver / Service Provider
- Merchant
- Tourist Guide
- Investor
- Admin

## Current Behavior
- Users can navigate from the profile page to a dedicated change-password page.
- The login page exposes a visible password-reset entry point.
- Password reset is a two-step OTP flow:
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
- Successful change/reset sends confirmation email and revokes prior sessions.

## Expected Behavior

### Change Password (Authenticated User)
- A "Change Password" section/button exists in the profile or account settings page.
- The user is presented with a form:
  - Current Password
  - New Password
  - Confirm New Password
- On submission, the password is updated and the user receives a confirmation (in-app + email).
- If the current password is wrong, a clear error is shown.

### Forgot / Reset Password (Unauthenticated User)
- A "Forgot Password?" link exists on the login page.
- The user enters their registered email address.
- A password reset OTP is sent to that email.
- The user opens the reset confirmation page and submits email, OTP, and the new password.
- The OTP expires after the configured time window and cannot be reused.

---

## Required Implementation

### Backend
1. **Change Password endpoint** (authenticated):
   - `POST /api/v1/auth/change-password`
   - Body: `{ currentPassword, newPassword }`
   - Validate current password before updating.
   - Hash the new password before storing.
   - Invalidate existing sessions/tokens on password change.

2. **Forgot Password — Request Reset** (unauthenticated):
   - `POST /api/v1/auth/password-reset/request`
   - Body: `{ email }`
   - Generate a time-limited OTP.
   - Send reset email with the OTP.
   - Always return a generic success response (do not confirm whether the email exists — security best practice).

3. **Forgot Password — Confirm Reset** (unauthenticated):
   - `POST /api/v1/auth/password-reset/confirm`
   - Body: `{ email, otp, newPassword }`
   - Validate OTP existence, expiry, and single-use behavior.
   - Update password, send confirmation email, and invalidate prior sessions.

### Frontend
1. Add a **"Change Password"** section to the profile/account settings page (all dashboards).
   - Form: Current Password / New Password / Confirm New Password
   - Show inline validation (password strength, confirmation match).
   - Show success/error feedback after submission.

2. Add a **"Forgot Password?"** link on the login page.
   - Page: email input + submit.
   - Confirmation screen: "If this email is registered, you will receive a reset code."

3. Add a **Reset Password confirmation page**:
   - Form: Email / OTP / New Password / Confirm New Password.
   - On success: sign the user in with fresh tokens and show a success message.
   - On invalid/expired OTP: show a clear error with option to request a new code.

---

## Security Considerations
- Reset tokens must be single-use and time-limited (recommend 30–60 min expiry).
- Passwords must be hashed (bcrypt or equivalent) — never stored in plain text.
- Do not reveal whether an email is registered in the forgot-password response.
- Invalidate all active sessions after a password change/reset (optional, recommended for security-sensitive apps).
- Enforce a minimum password strength policy (e.g., min 8 characters, at least one number).

---

## Acceptance Criteria
- [x] Authenticated users can change their password from their profile settings
- [x] Incorrect current password returns a clear error message
- [x] "Forgot Password?" link is visible on the login page
- [x] Password reset email is sent with a valid, time-limited OTP
- [x] Reset OTP expires correctly and cannot be reused
- [x] New password is validated for strength and confirmation match before submission
- [x] User receives confirmation in the web app and by email after successfully changing/resetting password
- [x] Feature is implemented through the shared auth and profile flows used across roles
