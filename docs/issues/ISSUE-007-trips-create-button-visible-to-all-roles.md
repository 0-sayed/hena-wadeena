# ISSUE-007 — Trips: "Create New Trip" Button Visible to All Roles

## Status
- [ ] Open

## Priority
High

## Affected Area
Trips Section — UI Role-Based Access Control (RBAC)

## Description
The **"Create New Trip"** button is currently displayed to all authenticated users regardless of their role. This is incorrect — only users with the `admin` or `driver` role should be able to see and interact with this button. Exposing it to all roles is both a UX issue and a potential security/data integrity concern.

## Current Behavior
- Any logged-in user (regardless of role) can see the "Create New Trip" button in the Trips section.
- Users outside the intended roles (`admin`, `driver`) may attempt to create trips, which either fails silently or causes unintended data.

## Expected Behavior
- The "Create New Trip" button is **only visible** to users with the role `admin` or `driver`.
- All other roles (e.g., tourist, investor, merchant, guide) do not see the button at all.
- If a non-authorized user somehow reaches the creation route directly (e.g., via URL), they should be redirected or shown a "403 Forbidden / Not Authorized" message.

## Root Cause
The frontend is not checking the authenticated user's role before rendering the "Create New Trip" button. Role-based conditional rendering is either missing or misconfigured for this component.

## Required Fix

### Frontend
1. Retrieve the authenticated user's role from the auth context/store.
2. Conditionally render the "Create New Trip" button only when `role === 'admin' || role === 'driver'`.
3. Guard the trip creation route — redirect unauthorized users away from `/trips/create` (or equivalent).

### Backend (Defense in Depth)
- Ensure the `POST /api/v1/trips` (or equivalent) endpoint has a role guard that rejects requests from non-`admin`/non-`driver` users with `403 Forbidden`.

## Roles Allowed
| Role | Can Create Trip |
|---|---|
| `admin` | ✅ Yes |
| `driver` | ✅ Yes |
| `tourist` | ❌ No |
| `investor` | ❌ No |
| `merchant` | ❌ No |
| `guide` | ❌ No |

## Acceptance Criteria
- [ ] "Create New Trip" button is hidden for all roles except `admin` and `driver`
- [ ] Navigating directly to the trip creation route as an unauthorized user results in a redirect or 403 message
- [ ] Backend rejects trip creation requests from unauthorized roles with `403 Forbidden`
- [ ] No visual regressions in the Trips section for authorized roles
