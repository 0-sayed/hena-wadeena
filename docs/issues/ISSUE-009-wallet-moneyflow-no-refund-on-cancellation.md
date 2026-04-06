# ISSUE-009 — Wallet / Money Flow: No Refund on Trip Cancellation & No Credit to Service Provider

## Status
- [ ] Open
- [x] Core booking wallet lifecycle implemented

## Priority
🚨 Critical

## Affected Area
Wallet System — Trip Booking & Cancellation Flow — Financial Transactions

## Description
The booking wallet lifecycle now has concrete backend handling:

1. `booking.requested` debits the tourist wallet.
2. `booking.cancelled` refunds the tourist wallet.
3. `booking.completed` credits the guide wallet.
4. Every booking-linked mutation is written to a wallet ledger with a booking reference and idempotency key.

The issue remains open because the current implementation is still an eventual, cross-service event flow. It does **not** yet provide an escrow/hold model or a cross-service atomic guarantee between booking state changes and wallet mutations.

## Reproduction Steps
1. Log in as a user with sufficient wallet balance.
2. Book a trip with a service provider.
3. Verify wallet balance is deducted. ✅
4. Cancel the trip (either by user or admin).
5. Check user wallet — balance is **not refunded**. ❌
6. Check service provider wallet/earnings — **no credit received**. ❌

## Current Money Flow

```
User Wallet ──[booking.requested debit]──► Balance mutation + ledger row
Booking Cancelled ───────────────────────► Refund ledger row + balance credit
Booking Completed ───────────────────────► Guide payout ledger row + balance credit
```

## Expected Money Flow

### Scenario A — Trip Completed Successfully
```
User Wallet ──[deduct]──► Escrow/Hold
Trip Completed ──────────► Release to Service Provider Wallet
```

### Scenario B — Trip Canceled
```
User Wallet ──[deduct]──► Escrow/Hold
Trip Canceled ───────────► Refund back to User Wallet
                        ──► No credit to Service Provider
```

> **Note:** Depending on business rules, partial refunds or cancellation fees may apply. These rules are still not defined in the current implementation.

## Current Gaps
- No escrow or held-funds state tied to the booking lifecycle.
- No cross-service atomic transaction spanning guide-booking and identity.
- Cancellation policy edge cases are still undefined.
- The implementation is idempotent and auditable, but still eventually consistent across services.

## Remaining Fix

### Backend
1. **Implement an escrow/hold mechanism** for trip payments:
   - On booking: deduct from user wallet → place in a "held" state tied to the booking.
   - On trip completion: release held amount → credit service provider wallet.
   - On cancellation: release held amount → refund user wallet (apply cancellation policy if applicable).

2. **If the direct deduction model remains:**
   - Keep the current debit / refund / payout event handlers.
   - Add an explicit reconciliation strategy for booking events that fail to apply downstream.
   - Document the eventual consistency tradeoff clearly.

3. **Audit trail:**
   - Keep the booking-linked wallet ledger and idempotency constraints in place.
   - Expose dispute-resolution and reconciliation tooling if needed.

### Cancellation Policy (needs business decision)
The following scenarios should be defined and handled:

| Cancellation By | Timing | Refund to User | Credit to Provider |
|---|---|---|---|
| User | Before trip starts | Full refund | None |
| User | After trip started | Partial / None (TBD) | Partial / None (TBD) |
| Service Provider | Any time | Full refund | None |
| Admin | Any time | Full refund | None |

## Impact
- Users are losing real money with no recourse.
- Service providers are not being compensated for completed trips.
- This is a **data integrity and financial correctness** issue that must be treated as the highest priority.

## Acceptance Criteria
- [x] When a trip is canceled, the user's wallet is refunded the correct amount
- [x] When a trip is completed, the service provider's wallet receives the correct credit
- [ ] Cancellation refunds are atomic across service boundaries
- [x] Every wallet transaction references the associated booking ID
- [ ] Cancellation policy edge cases are defined and handled
- [ ] No money is "lost" between wallet states in any booking lifecycle scenario, including downstream delivery failures
