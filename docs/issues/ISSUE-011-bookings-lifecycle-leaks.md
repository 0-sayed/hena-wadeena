# ISSUE-011 — Bookings: Handling Leaks & Lifecycle Inconsistencies

## Status
- [ ] Open
- [x] State machine enforcement and slot conflict prevention implemented

## Priority
🚨 Critical

## Affected Area
Bookings System — Full Lifecycle (Create → Confirm → Complete / Cancel)

## Description
The bookings system has several unresolved gaps and inconsistencies throughout its lifecycle — referred to as "leaks in the pipe." These affect financial correctness, status transitions, user experience, and downstream features (ratings, wallet, dashboards).

The issues range from missing status transitions, lack of notifications, unhandled edge cases, and unclear ownership of state changes.

> This issue serves as an **umbrella tracker** for booking-related problems. Specific sub-issues should be broken out as they are identified.

---

## Known Leaks

### Leak 1 — Wallet Side Effects Still Depend on Cross-Service Event Delivery
**See ISSUE-009.** Booking wallet side effects now exist for request, cancellation, and completion, but the lifecycle is still eventually consistent across guide-booking and identity. Escrow and cross-service atomicity are still absent.

### Leak 2 — Booking Status Lifecycle Was Previously Unclear
The booking service now enforces the main lifecycle transitions server-side. Invalid transitions are rejected, and completed bookings can be reviewed. This umbrella issue stays open because adjacent lifecycle concerns still exist.

**Suggested Status Lifecycle:**
```
PENDING ──► CONFIRMED ──► IN_PROGRESS ──► COMPLETED
    │              │              │
    ▼              ▼              ▼
CANCELED       CANCELED       CANCELED (with partial refund policy)
```

Current implementation:
- Validates transitions server-side.
- Publishes booking events with richer payloads.
- Allows review creation after completed bookings.
- Still relies on downstream consumers for some side effects.

### Leak 3 — Notification Payload Mismatch Previously Broke Booking Notifications
The booking event payloads are now enriched with the fields the identity notification consumer needs, including user ids, package titles, and cancellation metadata. Notification creation is no longer blocked on sparse event payloads.

**Expected notifications:**
| Event | Notify User | Notify Provider |
|---|---|---|
| Booking created | ✅ Confirmation | ✅ New booking alert |
| Booking confirmed | ✅ | — |
| Booking canceled (by user) | ✅ | ✅ |
| Booking canceled (by provider) | ✅ | ✅ |
| Trip completed | ✅ Rate prompt | ✅ Payment credit |

### Leak 4 — Rating System Not Triggered on Completion
When a booking reaches `completed` status, there is no mechanism to unlock or prompt the rating flow. See **ISSUE-010**.

### Leak 5 — Double Booking Prevention Was Missing
Active same-slot double booking is now blocked in two layers:
- application-level conflict detection during booking creation
- database-level partial unique index for `pending`, `confirmed`, and `in_progress`

### Leak 6 — Booking Freshness Needed Active Refresh
The web client now polls booking queries for authenticated users with a 30-second interval. This closes the basic freshness gap, but it is still a polling-based first pass rather than real-time updates.

---

## Required Fix

### Backend
1. **Define and document** the full booking status lifecycle with allowed transitions.
2. **Enforce transitions server-side** — reject invalid status changes with `400 Bad Request`.
3. **Tie side effects to transitions atomically:**
   - `CANCELED` → trigger refund (ISSUE-009)
   - `COMPLETED` → trigger provider credit + unlock rating (ISSUE-010)
4. **Add conflict detection** — prevent double-booking same provider for overlapping time slots.
5. **Implement notification dispatch** on each status transition (push, email, or in-app — whichever is supported).

### Frontend
1. Display the current booking status clearly on all relevant pages.
2. Show only the actions valid for the current status (e.g., "Cancel" only when status allows it).
3. Reflect status updates promptly (use polling or websocket if needed).

---

## Related Issues
| Issue | Relation |
|---|---|
| ISSUE-009 | Wallet not updated on cancellation — a direct booking lifecycle leak |
| ISSUE-010 | Rating system not triggered on completion — downstream of booking lifecycle |
| ISSUE-005 | Inquiry system 404 — may share backend structural issues |

---

## Acceptance Criteria
- [x] Booking status lifecycle is documented and enforced via a state machine
- [x] Invalid status transitions are rejected by the backend
- [ ] Cancellation always triggers refund with cross-service atomic guarantees (ISSUE-009 fully resolved)
- [ ] Completion always triggers provider credit + rating prompt (ISSUE-010 resolved)
- [x] Notifications are sent on booking create / confirm / cancel / complete with complete payloads
- [x] Double-booking prevention is in place for service providers
- [x] Booking dashboards use active polling to stay reasonably fresh
