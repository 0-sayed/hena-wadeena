# ISSUE-012 — Profiles: No Reset / Change Password Feature

## Status
- [ ] Open

## Priority
🔴 High

## Affected Area
All User Profiles — Account Settings / Security Section

## Description
There is no way for a user to **change their password** from within their profile, and no **"Forgot Password"** / reset flow exists (or if it does, it is not accessible). This is a standard security feature expected in any authenticated application and its absence is a significant gap in account management.

## Affected Roles
All roles are affected:
- Tourist
- Driver / Service Provider
- Merchant
- Tourist Guide
- Investor
- Admin

## Current Behavior
- User navigates to their profile / account settings.
- There is no "Change Password" button, form, or link anywhere in the UI.
- If a user forgets their password, there is no self-service recovery path.

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
- A password reset link/OTP is sent to that email.
- The user clicks the link and is taken to a page to set a new password.
- The reset link expires after a set time window (e.g., 15–60 minutes).

---

## Required Implementation

### Backend
1. **Change Password endpoint** (authenticated):
   - `PATCH /api/v1/auth/change-password`
   - Body: `{ currentPassword, newPassword }`
   - Validate current password before updating.
   - Hash the new password before storing.
   - Invalidate existing sessions/tokens on password change (optional but recommended).

2. **Forgot Password — Request Reset** (unauthenticated):
   - `POST /api/v1/auth/forgot-password`
   - Body: `{ email }`
   - Generate a signed, time-limited reset token.
   - Send reset email with a link containing the token.
   - Always return a generic success response (do not confirm whether the email exists — security best practice).

3. **Forgot Password — Confirm Reset** (unauthenticated):
   - `POST /api/v1/auth/reset-password`
   - Body: `{ token, newPassword }`
   - Validate token (existence, expiry, not already used).
   - Update password and invalidate the token.

### Frontend
1. Add a **"Change Password"** section to the profile/account settings page (all dashboards).
   - Form: Current Password / New Password / Confirm New Password
   - Show inline validation (password strength, confirmation match).
   - Show success/error feedback after submission.

2. Add a **"Forgot Password?"** link on the login page.
   - Page: email input + submit.
   - Confirmation screen: "If this email is registered, you will receive a reset link."

3. Add a **Reset Password page** (accessed via the email link):
   - Form: New Password / Confirm New Password.
   - On success: redirect to login with a success message.
   - On invalid/expired token: show a clear error with option to request a new link.

---

## Security Considerations
- Reset tokens must be single-use and time-limited (recommend 30–60 min expiry).
- Passwords must be hashed (bcrypt or equivalent) — never stored in plain text.
- Do not reveal whether an email is registered in the forgot-password response.
- Invalidate all active sessions after a password change/reset (optional, recommended for security-sensitive apps).
- Enforce a minimum password strength policy (e.g., min 8 characters, at least one number).

---

## Acceptance Criteria
- [ ] Authenticated users can change their password from their profile settings
- [ ] Incorrect current password returns a clear error message
- [ ] "Forgot Password?" link is visible on the login page
- [ ] Password reset email is sent with a valid, time-limited token
- [ ] Reset token expires correctly and cannot be reused
- [ ] New password is validated for strength and confirmation match before submission
- [ ] User receives confirmation (in-app + email) after successfully changing/resetting password
- [ ] Feature works consistently across all user roles and dashboards
