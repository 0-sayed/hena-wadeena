# ISSUE-008 — Investment Page: Contact Button Visible to All Roles

## Status
- [ ] Open

## Priority
High

## Affected Area
Investment Page — Role-Based Access Control (RBAC)

## Description
The **Contact** button on investment listings is currently displayed to all authenticated users regardless of their role. This button should only be visible and accessible to users with the `admin` or `investor` role. Showing it to all users leads to unauthorized or irrelevant contact attempts and creates noise for listing owners.

## Current Behavior
- Any authenticated user can see and click the Contact button on investment listings.
- Users who are not `admin` or `investor` can initiate contact/inquiry flows they should have no access to.

## Expected Behavior
- The Contact button on investment listings is **only visible** to users with the role `admin` or `investor`.
- All other roles do not see the button.
- Direct access to the inquiry/contact flow by unauthorized roles is blocked at both the frontend and backend level.

## Root Cause
The frontend renders the Contact button without checking the current user's role against the allowed roles for this action. Role-based conditional rendering is missing for this component.

## Required Fix

### Frontend
1. Read the authenticated user's role from the auth context/store.
2. Conditionally render the Contact button only when `role === 'admin' || role === 'investor'`.
3. If an unauthorized user accesses the contact flow via direct URL or other means, redirect them or show a "Not Authorized" message.

### Backend (Defense in Depth)
- Ensure the investment inquiry/contact endpoint enforces a role guard and returns `403 Forbidden` for non-`admin`/non-`investor` users.

## Roles Allowed
| Role | Can Use Investment Contact |
|---|---|
| `admin` | ✅ Yes |
| `investor` | ✅ Yes |
| `tourist` | ❌ No |
| `driver` | ❌ No |
| `merchant` | ❌ No |
| `guide` | ❌ No |

## Related Issues
- **ISSUE-003** — Startup contact request returns 404; the role guard fix here should be applied consistently to the startup contact flow as well once ISSUE-003 is resolved.

## Acceptance Criteria
- [ ] Investment Contact button is hidden for all roles except `admin` and `investor`
- [ ] Unauthorized users cannot access the contact/inquiry flow via direct URL
- [ ] Backend returns `403 Forbidden` for contact requests from unauthorized roles
- [ ] No visual regressions for `admin` and `investor` users
