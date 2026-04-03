# ISSUE-009 — Wallet / Money Flow: No Refund on Trip Cancellation & No Credit to Service Provider

## Status
- [ ] Open

## Priority
🚨 Critical

## Affected Area
Wallet System — Trip Booking & Cancellation Flow — Financial Transactions

## Description
A critical financial logic bug exists in the trip booking and cancellation flow. When a user books a trip, the fare is correctly deducted from their wallet. However, when the trip is subsequently **canceled**, two major failures occur simultaneously:

1. **The user's wallet is NOT refunded** — the deducted balance is lost entirely.
2. **The service provider does NOT receive a credit** — payment is never transferred to them either.

Money is deducted from the user's wallet and disappears into a void. Neither party ends up with the correct balance.

## Reproduction Steps
1. Log in as a user with sufficient wallet balance.
2. Book a trip with a service provider.
3. Verify wallet balance is deducted. ✅
4. Cancel the trip (either by user or admin).
5. Check user wallet — balance is **not refunded**. ❌
6. Check service provider wallet/earnings — **no credit received**. ❌

## Current (Broken) Money Flow

```
User Wallet ──[deduct]-──► ???? (lost)
                              ▲
                      Cancellation ──► No refund to user
                                   ──► No credit to service provider
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

> **Note:** Depending on business rules, partial refunds or cancellation fees may apply. These rules need to be defined and documented.

## Root Cause (Suspected)
The cancellation handler in the backend likely does not trigger a wallet transaction reversal or refund. The booking payment may be processed as a direct deduction rather than being held in escrow until the trip is confirmed/completed, making reversal on cancellation absent.

## Required Fix

### Backend
1. **Implement an escrow/hold mechanism** for trip payments:
   - On booking: deduct from user wallet → place in a "held" state tied to the booking.
   - On trip completion: release held amount → credit service provider wallet.
   - On cancellation: release held amount → refund user wallet (apply cancellation policy if applicable).

2. **If escrow is not feasible (direct deduction model):**
   - On cancellation: explicitly trigger a wallet credit transaction back to the user.
   - Ensure this transaction is atomic — it should not be possible for the cancellation to succeed without the refund also succeeding.

3. **Audit trail:**
   - Every wallet transaction (deduction, refund, credit) must be logged with a reference to the booking ID.
   - This enables tracing and dispute resolution.

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
- [ ] When a trip is canceled, the user's wallet is refunded the correct amount
- [ ] When a trip is completed, the service provider's wallet receives the correct credit
- [ ] Cancellation refunds are atomic — they cannot partially succeed
- [ ] Every wallet transaction references the associated booking ID
- [ ] Cancellation policy edge cases are defined and handled
- [ ] No money is "lost" between wallet states in any booking lifecycle scenario
