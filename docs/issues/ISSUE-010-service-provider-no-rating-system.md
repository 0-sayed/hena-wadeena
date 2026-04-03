# ISSUE-010 — Service Providers: No Rating & Review System Defined or Implemented

## Status
- [ ] Open

## Priority
Medium

## Affected Area
Service Providers — Ratings & Reviews — Post-Trip / Post-Service Flow

## Description
Star ratings are displayed on service provider profiles, but there is currently **no mechanism** for users to actually submit a rating or review. There is no defined rule for:

- **Who** can rate a service provider
- **When** a rating can be submitted (e.g., only after a completed booking)
- **How** ratings are submitted (no UI, no API)
- **How** ratings are aggregated and displayed

The ratings shown are either hardcoded, seeded, or stale — they do not reflect real user feedback. This undermines trust in the platform.

## Current Behavior
- Service provider profiles show a star rating (e.g., ⭐ 4.2).
- There is no button, form, or prompt for a user to submit a rating after using a service.
- No rating submission API appears to be implemented or accessible from the frontend.

## Expected Behavior
- After a booking is marked as **completed**, the user who made the booking is prompted (or has the option) to rate the service provider.
- The rating consists of a star score (1–5) and an optional text review.
- Submitted ratings are aggregated to update the service provider's displayed average rating.
- Service providers can view their ratings and reviews in their dashboard.

## Required Design Decisions (Business / Product)
The following must be agreed upon before implementation:

| Question | Options |
|---|---|
| Who can rate? | Only users who completed a booking with the provider |
| When can they rate? | Only after booking status = `completed` |
| Can a user rate the same provider multiple times? | One rating per booking, or one rating per provider? |
| Can ratings be edited after submission? | Yes / No / Within a time window |
| Are reviews moderated? | Auto-publish / Admin review before publish |
| Who can see reviews? | Public / Logged-in users only |

## Required Implementation

### Backend
1. Create a `ratings` (or `reviews`) table/collection:
   - `id`, `bookingId`, `reviewerId`, `serviceProviderId`, `score` (1–5), `comment` (optional), `createdAt`
2. `POST /api/v1/ratings` — submit a rating (restricted to users with a completed booking for that provider, one per booking).
3. `GET /api/v1/service-providers/:id/ratings` — fetch paginated ratings for a provider.
4. Aggregate average rating and update provider profile on each new submission.
5. Guard: a rating cannot be submitted unless the booking exists, belongs to the reviewer, and has status `completed`.

### Frontend
1. After a booking transitions to `completed`, show a **"Rate your experience"** prompt or card in the user's bookings history.
2. Rating UI: 1–5 star selector + optional text field + Submit button.
3. Display ratings/reviews on the service provider's profile/details page.
4. Show the aggregated average score with the number of ratings (e.g., ⭐ 4.3 · 28 reviews).

## Related Issues
- **ISSUE-009** — Wallet/cancellation flow must be stable before the `completed` booking status can be trusted as a rating trigger.
- **ISSUE-011** — General bookings handling leaks; the booking status lifecycle must be reliable for rating eligibility to work correctly.

## Acceptance Criteria
- [ ] A user who has a `completed` booking can submit a rating (1–5 stars + optional comment)
- [ ] A user cannot rate a provider without a completed booking with them
- [ ] A user cannot submit more than one rating per booking
- [ ] Ratings are aggregated and the average is displayed on the provider's profile
- [ ] Service providers can view their received ratings in their dashboard
- [ ] Rating submission is blocked for canceled or pending bookings
