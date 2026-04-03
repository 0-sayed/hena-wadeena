# ISSUE-011 — Bookings: Handling Leaks & Lifecycle Inconsistencies

## Status
- [ ] Open

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

### Leak 1 — Cancellation Does Not Trigger Refund
**See ISSUE-009.** When a trip/booking is canceled, the user's wallet is not refunded and the service provider receives no credit. The financial side of the booking lifecycle is detached from the booking state machine.

### Leak 2 — No Clear Booking Status Lifecycle Defined
There is no documented or enforced state machine for bookings. It is unclear what the valid statuses are, which transitions are allowed, and who (user / provider / admin / system) can trigger each transition.

**Suggested Status Lifecycle:**
```
PENDING ──► CONFIRMED ──► IN_PROGRESS ──► COMPLETED
    │              │              │
    ▼              ▼              ▼
CANCELED       CANCELED       CANCELED (with partial refund policy)
```

Each transition should:
- Be validated server-side (no arbitrary status updates)
- Trigger the appropriate side effects (wallet, notifications, ratings unlock)

### Leak 3 — No Notifications on Booking State Changes
Users and service providers do not appear to receive notifications when a booking status changes (confirmed, canceled, completed). This leads to confusion about the current state of a booking.

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

### Leak 5 — No Conflict / Double-Booking Prevention
It is unclear whether the system prevents a service provider from being double-booked for the same time slot. If no conflict check exists, two users could book the same provider at the same time.

### Leak 6 — Booking History Inconsistencies Across Dashboards
Different dashboards (user, provider, admin) may show inconsistent or stale booking data. There is no clear indication of whether real-time updates or polling is used.

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
- [ ] Booking status lifecycle is documented and enforced via a state machine
- [ ] Invalid status transitions are rejected by the backend
- [ ] Cancellation always triggers refund (ISSUE-009 resolved)
- [ ] Completion always triggers provider credit + rating prompt (ISSUE-010 resolved)
- [ ] Notifications are sent on all status transitions
- [ ] Double-booking prevention is in place for service providers
- [ ] All dashboards show consistent, up-to-date booking data
