# Issues Index — Hena Wadeena Project

> This index tracks all known technical issues for the project. Each issue has its own dedicated file with full context, root cause analysis, and acceptance criteria to guide resolution.

---

## Summary Table

| ID | Title | Area | Priority | Status |
|---|---|---|---|---|
| [ISSUE-001](./ISSUE-001-guide-profile-validation-error.md) | Guide Profile Creation: Validation Error (400) | Tourist Guide Dashboard | 🔴 High | Open |
| [ISSUE-002](./ISSUE-002-investment-startup-missing-details-page.md) | Investment Page: Missing Startup Details Button & Page | Investment Page | 🔴 High | Open |
| [ISSUE-003](./ISSUE-003-investment-startup-contact-request-404.md) | Investment Page: Startup Contact Request Returns 404 | Investment Page | 🔴 High | Open |
| [ISSUE-004](./ISSUE-004-merchant-dashboard-ad-form-should-be-modal.md) | Merchant Dashboard: Ad Form Should Be a Modal | Merchant Dashboard | 🟡 Medium | Open |
| [ISSUE-005](./ISSUE-005-dashboards-inquiries-loading-404.md) | All Dashboards: Inquiries Fail to Load (404) | All Dashboards | 🚨 Critical | Open |
| [ISSUE-006](./ISSUE-006-residence-inquiry-copies-instead-of-sending.md) | Residence Inquiry: Copies Details Instead of Sending | Residence Listings | 🔴 High | Open |
| [ISSUE-007](./ISSUE-007-trips-create-button-visible-to-all-roles.md) | Trips: "Create New Trip" Button Visible to All Roles | Trips — RBAC | 🔴 High | Open |
| [ISSUE-008](./ISSUE-008-investment-contact-button-visible-to-all-roles.md) | Investment: Contact Button Visible to All Roles | Investment Page — RBAC | 🔴 High | Open |
| [ISSUE-009](./ISSUE-009-wallet-moneyflow-no-refund-on-cancellation.md) | Wallet: No Refund on Cancellation & No Credit to Provider | Wallet / Money Flow | 🚨 Critical | Open |
| [ISSUE-010](./ISSUE-010-service-provider-no-rating-system.md) | Service Providers: No Rating & Review System | Ratings & Reviews | 🟡 Medium | Open |
| [ISSUE-011](./ISSUE-011-bookings-lifecycle-leaks.md) | Bookings: Lifecycle Leaks & Inconsistencies (Umbrella) | Bookings System | 🚨 Critical | Open |
| [ISSUE-012](./ISSUE-012-no-change-reset-password-feature.md) | Profiles: No Reset / Change Password Feature | All Profiles | 🔴 High | Open |

---

## Issues by Priority

### 🚨 Critical
- [ISSUE-005](./ISSUE-005-dashboards-inquiries-loading-404.md) — All dashboards: inquiries fail to load (404)
- [ISSUE-009](./ISSUE-009-wallet-moneyflow-no-refund-on-cancellation.md) — Wallet: no refund on cancellation, no credit to provider
- [ISSUE-011](./ISSUE-011-bookings-lifecycle-leaks.md) — Bookings: lifecycle leaks & inconsistencies *(umbrella issue)*

### 🔴 High
- [ISSUE-001](./ISSUE-001-guide-profile-validation-error.md) — Guide profile: validation error (400)
- [ISSUE-002](./ISSUE-002-investment-startup-missing-details-page.md) — Investment: missing startup details page
- [ISSUE-003](./ISSUE-003-investment-startup-contact-request-404.md) — Investment: startup contact request 404
- [ISSUE-006](./ISSUE-006-residence-inquiry-copies-instead-of-sending.md) — Residence inquiry: copies instead of sending
- [ISSUE-007](./ISSUE-007-trips-create-button-visible-to-all-roles.md) — Trips: create button visible to all roles
- [ISSUE-008](./ISSUE-008-investment-contact-button-visible-to-all-roles.md) — Investment: contact button visible to all roles
- [ISSUE-012](./ISSUE-012-no-change-reset-password-feature.md) — Profiles: no reset / change password feature

### 🟡 Medium
- [ISSUE-004](./ISSUE-004-merchant-dashboard-ad-form-should-be-modal.md) — Merchant dashboard: ad form should be modal
- [ISSUE-010](./ISSUE-010-service-provider-no-rating-system.md) — Service providers: no rating system

---

## Issues by Area

### Tourist Guide Dashboard
- [ISSUE-001](./ISSUE-001-guide-profile-validation-error.md) — Guide profile creation: validation error

### Investment Page
- [ISSUE-002](./ISSUE-002-investment-startup-missing-details-page.md) — Missing startup details page
- [ISSUE-003](./ISSUE-003-investment-startup-contact-request-404.md) — Startup contact request 404
- [ISSUE-008](./ISSUE-008-investment-contact-button-visible-to-all-roles.md) — Contact button visible to all roles (RBAC)

### Merchant Dashboard
- [ISSUE-004](./ISSUE-004-merchant-dashboard-ad-form-should-be-modal.md) — Ad form should be a modal

### All Dashboards
- [ISSUE-005](./ISSUE-005-dashboards-inquiries-loading-404.md) — Inquiries fail to load (404)

### Residence Listings
- [ISSUE-006](./ISSUE-006-residence-inquiry-copies-instead-of-sending.md) — Inquiry copies details instead of sending

### Trips
- [ISSUE-007](./ISSUE-007-trips-create-button-visible-to-all-roles.md) — Create trip button visible to all roles (RBAC)

### Wallet / Money Flow
- [ISSUE-009](./ISSUE-009-wallet-moneyflow-no-refund-on-cancellation.md) — No refund on cancellation, no credit to provider

### Ratings & Reviews
- [ISSUE-010](./ISSUE-010-service-provider-no-rating-system.md) — No rating system for service providers

### Bookings System
- [ISSUE-011](./ISSUE-011-bookings-lifecycle-leaks.md) — Bookings lifecycle leaks *(umbrella — links to ISSUE-009, ISSUE-010)*

### All Profiles (Account Settings)
- [ISSUE-012](./ISSUE-012-no-change-reset-password-feature.md) — No reset / change password feature

---

## Issues by Type

### Backend / API
- ISSUE-001 — Enum validation mismatch
- ISSUE-003 — Startup contact endpoint missing/broken
- ISSUE-005 — Inquiry routes return 404
- ISSUE-006 — Residence inquiry never reaches listing owner
- ISSUE-009 — Wallet not updated on trip cancellation
- ISSUE-010 — No ratings endpoint or data model
- ISSUE-011 — Booking state machine not enforced
- ISSUE-012 — Change/reset password endpoints missing

### Frontend
- ISSUE-001 — Free-text inputs must be dropdowns
- ISSUE-002 — Missing details button and page for startups
- ISSUE-004 — Ad form must be a modal
- ISSUE-006 — Submission triggers clipboard copy instead of API call
- ISSUE-007 — Create trip button not role-gated
- ISSUE-008 — Investment contact button not role-gated
- ISSUE-010 — No rating UI exists
- ISSUE-012 — No change/reset password UI in profile

### Security / RBAC
- ISSUE-007 — Create trip button exposed to unauthorized roles
- ISSUE-008 — Investment contact button exposed to unauthorized roles

### Financial / Data Integrity
- ISSUE-009 — Money lost on trip cancellation (critical)
- ISSUE-011 — Booking lifecycle does not enforce wallet side effects

---

## Dependency Map

```
ISSUE-011 (Bookings Umbrella)
  ├── ISSUE-009 (Wallet / Refund)
  └── ISSUE-010 (Ratings — unlocked by completed booking)

ISSUE-005 (Inquiry 404)
  ├── ISSUE-003 (Startup contact 404 — may share root cause)
  └── ISSUE-006 (Residence inquiry broken — may share root cause)
```

---

## Suggested Resolution Order for Agent

1. **ISSUE-009** — Fix wallet/refund logic first; financial integrity is the top priority.
2. **ISSUE-005** — Fix inquiry routes (404); unblocks communication across the whole platform.
3. **ISSUE-007 + ISSUE-008** — Quick frontend RBAC fixes; high security value, low effort.
4. **ISSUE-001** — Frontend dropdown fix; unblocks guide profile creation entirely.
5. **ISSUE-006** — Fix residence inquiry submission handler.
6. **ISSUE-003** — Implement startup contact endpoint.
7. **ISSUE-002** — Build startup details page.
8. **ISSUE-011** — Formalize booking lifecycle state machine (ongoing/structural).
9. **ISSUE-010** — Implement rating system (depends on stable booking lifecycle).
10. **ISSUE-004** — Convert ad form to modal (lowest risk, UI-only).
11. **ISSUE-012** — Add change/reset password feature to all profiles.
