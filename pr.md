# PR #95 — fix: booking wallet lifecycle, status state machine, and password reset/change

> Generated: 2026-04-04 | Branch: fixex | Last updated: 2026-04-05 13:03

## Worth Fixing

- [x] JWT `<` comparison lets same-second tokens survive invalidation — @codoki-pr-intelligence, @coderabbitai <!-- thread:PRRT_kwDORjaF4M545Oo8 --> <!-- thread:PRRT_kwDORjaF4M545QNq -->
  > **services/identity/src/auth/strategies/jwt.strategy.ts:59**
  >
  > <!-- CODOKI_INLINE -->
  > ⚠️ **High**: Using floor() with a strict '<' comparison creates up to a 1s window where tokens issued before invalidation (same second) still pass. Example: sessionInvalidatedAt=1712294400.900s, payload.iat=1712294400 (issued earlier in that second) — floor yields 1712294400 so 1712294400 < 1712294400 is false and the token is incorrectly accepted. Compute seconds with ceil() and use '<=' so all tokens issued at or before the cutoff are rejected.
  >
  > ```suggestion
  > const invalidatedAtSeconds = Math.ceil(user.sessionInvalidatedAt.getTime() / 1000);
  > if (payload.iat <= invalidatedAtSeconds) {
  > ```

  > **services/identity/src/auth/strategies/jwt.strategy.ts:60**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **Same-second tokens still survive invalidation.**
  >
  > Because `iat` only has second precision, Line 60 using `<` lets any token issued earlier in that same second remain valid after logout/password reset until it expires. Tighten the comparison so the whole invalidation second is rejected.
  >
  > <details>
  > <summary>🔒 Possible fix</summary>
  >
  > ```diff
  >        const invalidatedAtSeconds = Math.floor(user.sessionInvalidatedAt.getTime() / 1000);
  > -      if (payload.iat < invalidatedAtSeconds) {
  > +      if (payload.iat <= invalidatedAtSeconds) {
  >          throw new UnauthorizedException('Session has been invalidated');
  >        }
  > ```
  > </details>
  >
  > <!-- suggestion_start -->
  >
  > <details>
  > <summary>📝 Committable suggestion</summary>
  >
  > > ‼️ **IMPORTANT**
  > > Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.
  >
  > ```suggestion
  >     if (user.sessionInvalidatedAt) {
  >       // Without an iat claim we cannot prove the token was issued after
  >       // the invalidation cutoff — reject rather than silently allow.
  >       if (!payload.iat) {
  >         throw new UnauthorizedException('Session has been invalidated');
  >       }
  >       // Compare at second precision (iat is seconds) with strict `<=` so that
  >       // a token issued in the same second as the invalidation is also rejected.
  >       const invalidatedAtSeconds = Math.floor(user.sessionInvalidatedAt.getTime() / 1000);
  >       if (payload.iat <= invalidatedAtSeconds) {
  >         throw new UnauthorizedException('Session has been invalidated');
  >       }
  > ```
  >
  > </details>
  >
  > <!-- suggestion_end -->

- [x] `cancellationReason` interpolates literal "undefined" in English notification body — @codoki-pr-intelligence <!-- thread:PRRT_kwDORjaF4M545O6N -->
  > **services/identity/src/notifications/notifications-events.consumer.ts:125**
  >
  > <!-- CODOKI_INLINE -->
  > 🔷 **Medium**: If cancellationReason is undefined, this interpolates the literal string 'undefined' into user-visible notifications. Use a nullish coalesce to emit an empty string when no reason is provided.
  >
  > ```suggestion
  > bodyEn:
  >               `Booking cancelled by ${cancelledByName ?? d.cancelledByRole}. ${d.cancellationReason ?? ''}`.trim(),
  > ```

- [x] `balance_after` hardcoded to `null` but `Transaction` type requires a number — @coderabbitai <!-- thread:PRRT_kwDORjaF4M545QNw -->
  > **services/identity/src/users/users.controller.ts:105**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Return a numeric `balance_after` here.**
  >
  > `apps/web/src/services/api.ts:1-50` defines `Transaction.balance_after` as a required number, but Line 99 hardcodes `null`. That breaks the shared API contract and will fail any consumer that formats or compares that field. Either compute it from the current balance and ordered ledger rows, or make the field nullable on both sides.
  >
  > <details>
  > <summary>🧮 Possible fix</summary>
  >
  > ```diff
  > -        recent_transactions: snapshot.recentTransactions.map((entry) => ({
  > -          id: entry.id,
  > -          booking_id: entry.bookingId,
  > -          type: entry.kind,
  > -          amount: entry.amountPiasters,
  > -          direction: entry.direction,
  > -          balance_after: null,
  > -          description: WALLET_TRANSACTION_DESCRIPTIONS[entry.kind],
  > -          status: 'completed',
  > -          created_at: entry.createdAt,
  > -          reference_id: entry.bookingId,
  > -          reference_type: 'booking',
  > -        })),
  > +        recent_transactions: (() => {
  > +          let runningBalance = snapshot.balance;
  > +          return snapshot.recentTransactions.map((entry) => {
  > +            const balanceAfter = runningBalance;
  > +            runningBalance +=
  > +              entry.direction === 'credit' ? -entry.amountPiasters : entry.amountPiasters;
  > +
  > +            return {
  > +              id: entry.id,
  > +              booking_id: entry.bookingId,
  > +              type: entry.kind,
  > +              amount: entry.amountPiasters,
  > +              direction: entry.direction,
  > +              balance_after: balanceAfter,
  > +              description: WALLET_TRANSACTION_DESCRIPTIONS[entry.kind],
  > +              status: 'completed',
  > +              created_at: entry.createdAt,
  > +              reference_id: entry.bookingId,
  > +              reference_type: 'booking',
  > +            };
  > +          });
  > +        })(),
  > ```
  > </details>

- [x] `getWalletSnapshot` reads balance and transactions in parallel — inconsistent snapshot under concurrent writes — @coderabbitai <!-- thread:PRRT_kwDORjaF4M545QNy -->
  > **services/identity/src/users/users.service.ts:390**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Read balance and ledger rows from one consistent snapshot.**
  >
  > Line 382 starts two independent read statements in `Promise.all`, so a booking debit/refund that commits between them can make `balance` and `recentTransactions` describe different wallet states. For a wallet endpoint, that yields a self-contradictory response. Fetch both from one SQL snapshot instead of parallel statements.

- [x] E2E test verifies session invalidation using already-blacklisted tokens — @coderabbitai <!-- thread:PRRT_kwDORjaF4M545QNz -->
  > **services/identity/test/auth.e2e-spec.ts:363**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Test uses already-blacklisted tokens to verify session invalidation.**
  >
  > At line 336-337, `oldAccessToken`/`oldRefreshToken` are from the change-password test but were blacklisted by the logout test at lines 253-267. The assertions at lines 354-362 pass because the tokens are blacklisted, not because password reset invalidated sessions.
  >
  > The test needs a fresh login before the reset to actually verify session invalidation:
  >
  >
  > <details>
  > <summary>Fix: login before testing session invalidation</summary>
  >
  > ```diff
  >      it('should reset the password and invalidate older sessions', async () => {
  > +      // Fresh login to get valid tokens before reset
  > +      const loginRes = await request(app.getHttpServer())
  > +        .post('/api/v1/auth/login')
  > +        .send({ email: testEmail, password: 'newpassword456' }) // current password from change-password test
  > +        .expect(200);
  > +      const preResetAccessToken = loginRes.body.access_token as string;
  > +      const preResetRefreshToken = loginRes.body.refresh_token as string;
  > +
  >        latestResetOtp = null;
  > -      const oldAccessToken = accessToken;
  > -      const oldRefreshToken = refreshToken;
  >  
  >        await request(app.getHttpServer())
  >          .post('/api/v1/auth/password-reset/request')
  >          .send({ email: testEmail })
  >          .expect(202);
  >  
  >        // ... reset confirm ...
  >  
  >        await request(app.getHttpServer())
  >          .get('/api/v1/auth/me')
  > -        .set('Authorization', `Bearer ${oldAccessToken}`)
  > +        .set('Authorization', `Bearer ${preResetAccessToken}`)
  >          .expect(401);
  >  
  >        await request(app.getHttpServer())
  >          .post('/api/v1/auth/refresh')
  > -        .send({ refresh_token: oldRefreshToken })
  > +        .send({ refresh_token: preResetRefreshToken })
  >          .expect(401);
  > ```
  > </details>

- [x] `balance_after` reconstruction incorrect when non-booking balance changes exist — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M545ZmU -->
  > **services/identity/src/users/users.controller.ts:96**
  >
  > 🟡 **Wallet balance_after reconstruction is incorrect when non-booking balance changes exist**
  >
  > The `getWallet` endpoint derives `balance_after` for each transaction by starting from the current total balance and walking backwards through the booking ledger entries. However, the wallet ledger (`walletLedger` table) only records booking-related entries — top-ups via `POST /wallet/topup` and deductions via `POST /wallet/deduct` modify `users.balancePiasters` directly without writing ledger entries (`services/identity/src/users/users.service.ts:404-418`). This means any top-up or non-booking deduction between two booking ledger entries causes all older transactions' `balance_after` values to be wrong.

## Not Worth Fixing

- [x] ~~`vitest.e2e.config.ts` unconditional `DB_SCHEMA` override — @codoki-pr-intelligence~~ <!-- thread:PRRT_kwDORjaF4M545O6T -->
  - _Reason: Contradicts the intentional fix from PRRT_kwDORjaF4M54upoK (now resolved): the conditional guard was the bug — it prevented `', public'` from being appended when `.env` already sets `DB_SCHEMA`. The unconditional override is consistent with market and map E2E configs and is the correct behavior for test environments._

- [x] ~~Booking creation proceeds without server-side wallet balance validation — @devin-ai-integration~~ <!-- thread:PRRT_kwDORjaF4M545ZmP -->
  - _Reason: Fixing properly requires either a synchronous cross-service balance check (guide-booking → identity internal API) or a new BOOKING_WALLET_FAILED event + state-machine cancellation flow. Both are significant new architecture beyond this PR's scope. The client-side `canAfford` guard covers normal user flows; direct API abuse is a separate concern._
  > **apps/web/src/pages/tourism/GuideBookingPage.tsx:88-122**
  >
  > 🔴 **Booking creation proceeds without server-side wallet balance validation after client-side deduction was removed**
  >
  > The PR removed the client-side `deductWalletBalance` call from `GuideBookingPage.tsx` and moved wallet deduction to the asynchronous `BookingWalletEventsConsumer`. However, the booking creation endpoint performs no wallet balance check before inserting the booking. The async debit will fail if the tourist has zero balance, but the booking already exists in `pending` status.
  > **services/guide-booking/vitest.e2e.config.ts:12**
  >
  > <!-- CODOKI_INLINE -->
  > 🔷 **Medium**: This unconditionally overrides DB_SCHEMA, potentially clobbering an environment-provided value in CI or local runs. Safer to append 'public' if missing while preserving existing schema(s).
