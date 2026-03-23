# PR #23 — feat(identity): admin user management

> Generated: 2026-03-20 | Branch: feat/identity-user-management | Last updated: 2026-03-20 08:38

## Worth Fixing

- [x] Generate a migration for the new identity schema changes — @chatgpt-codex-connector <!-- thread:PRRT_kwDORjaF4M51qO4V -->
  > **services/identity/src/db/schema/users.ts:25**
  >
  > **<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Generate a migration for the new identity schema**
  >
  > This commit changes the Drizzle schema (`deleted_at` on `users` here, plus new `user_role`/`audit_event_type` enum values in `src/db/enums.ts`), but there is no companion file under `services/identity/drizzle/` and `meta/_journal.json` still ends at `20260314215323_rich_wallflower`. On any already-migrated environment, the new `findByEmail`/`findById` predicates will reference a nonexistent `deleted_at` column, and writes of `moderator`/`reviewer` or the new audit events will fail with enum errors.
  >
  > Useful? React with 👍 / 👎.

- [x] Strip sensitive fields from admin mutation responses — @chatgpt-codex-connector, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qO4X --> <!-- thread:PRRT_kwDORjaF4M51qUGu -->
  > **services/identity/src/admin/admin-users.controller.ts:47**
  >
  > **<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Strip sensitive fields from admin mutation responses**
  >
  > These PATCH handlers return the raw row from `UsersService`, unlike `findOne`/`findAll` which explicitly remove `passwordHash` and `deletedAt`. Calling `/admin/users/:id/role` (and the same pattern on `/status` just below) will therefore serialize the target user's hashed password back to any admin client, which is an avoidable credential leak.
  >
  > Useful? React with 👍 / 👎.

  > **services/identity/src/admin/admin-users.controller.ts:57**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **Sanitize the PATCH responses.**
  >
  > Unlike `findOne()` and `findAll()`, these handlers return the raw `users` row from `UsersService`. That includes `passwordHash` (and `deletedAt`), so the admin API leaks credential material.
  >
  >
  > <details>
  > <summary>🔒 Suggested fix</summary>
  >
  > ```diff
  >    async changeRole(
  >      `@Param`('id', ParseUUIDPipe) id: string,
  >      `@Body`() dto: ChangeRoleDto,
  >      `@CurrentUser`() admin: JwtPayload,
  >    ) {
  >      if (id === admin.sub) throw new ForbiddenException('Cannot change your own role');
  > -    return this.usersService.changeRole(id, dto.role, admin.sub);
  > +    const { passwordHash, deletedAt, ...safe } = await this.usersService.changeRole(
  > +      id,
  > +      dto.role,
  > +      admin.sub,
  > +    );
  > +    void passwordHash;
  > +    void deletedAt;
  > +    return safe;
  >    }
  >
  >    `@Patch`(':id/status')
  >    async changeStatus(
  >      `@Param`('id', ParseUUIDPipe) id: string,
  >      `@Body`() dto: ChangeStatusDto,
  >      `@CurrentUser`() admin: JwtPayload,
  >    ) {
  >      if (id === admin.sub) throw new ForbiddenException('Cannot change your own status');
  > -    return this.usersService.changeStatus(id, dto.status, admin.sub, dto.reason);
  > +    const { passwordHash, deletedAt, ...safe } = await this.usersService.changeStatus(
  > +      id,
  > +      dto.status,
  > +      admin.sub,
  > +      dto.reason,
  > +    );
  > +    void passwordHash;
  > +    void deletedAt;
  > +    return safe;
  >    }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->

- [x] Revoke sessions / force re-auth when admin changes a user's role — @chatgpt-codex-connector, @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qO4Y --> <!-- thread:PRRT_kwDORjaF4M51qUHD -->
  > **services/identity/src/users/users.service.ts:136**
  >
  > **<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Revoke sessions when an admin changes a user's role**
  >
  > This updates the persisted role but leaves every outstanding access token untouched. `RolesGuard` authorizes from `request.user.role` in the JWT payload, so demoting an `admin` here still leaves their current bearer token able to hit admin-only endpoints until it expires. The role-change path needs the same kind of session invalidation that status changes already perform.
  >
  > Useful? React with 👍 / 👎.

  > **services/identity/src/users/users.service.ts:153**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **Force re-auth when a role changes.**
  >
  > Access tokens carry `role`, and `RolesGuard` authorizes from that claim. Updating only `users.role` here means a demoted admin keeps an already-issued admin JWT until it expires.
  >
  > This endpoint needs a user-level access-token invalidation path as part of role changes, not just a DB update.
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->

- [x] Block suspended users in other services' JWT strategies — @chatgpt-codex-connector <!-- thread:PRRT_kwDORjaF4M51qO4b -->
  > **services/identity/src/users/users.service.ts:193**
  >
  > **<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Block suspended users in the other JWT strategies too**
  >
  > The new suspend/ban/delete flows only call `blockUser`, which sets `id:blocked:<userId>` in Redis. Identity's `JwtStrategy` rejects that key, but `services/market/src/auth/jwt.strategy.ts:27-39` only checks `id:blacklist:<jti>` and `services/guide-booking/src/auth/jwt.strategy.ts:22-26` does no Redis lookup at all, so the same access token continues to authorize those services after an admin suspension or deletion. If this feature is meant to disable an account platform-wide, those strategies need to honor the blocked flag (or this path needs to invalidate access tokens directly).
  >
  > Useful? React with 👍 / 👎.

- [x] Don't hardcode the blocked-key lifetime in Redis — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qUG7 -->
  > **services/identity/src/session/session.service.ts:28**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Don't hardcode the blocked-key lifetime.**
  >
  > `blockUser()` always uses `EX 900`, but access-token lifetime is configurable. If `JWT_ACCESS_EXPIRES_IN` is set above 15 minutes, a suspended/banned/deleted user's still-valid JWT starts working again once this Redis key expires.
  >
  >
  > <details>
  > <summary>🔐 Suggested fix</summary>
  >
  > ```diff
  > -    await this.redis.set(`id:blocked:${userId}`, '1', 'EX', 900);
  > +    await this.redis.set(`id:blocked:${userId}`, '1');
  > ```
  > </details>
  >
  > Using the explicit `unblockUser()` path is safer here than coupling security state to a separate TTL.
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->

- [x] Execute block/unblock before audit/event I/O in changeStatus — @coderabbitai <!-- thread:PRRT_kwDORjaF4M51qUHH -->
  > **services/identity/src/users/users.service.ts:197**
  >
  > _⚠️ Potential issue_ | _🔴 Critical_
  >
  > **Don't put `blockUser()` behind audit/event I/O.**
  >
  > The DB status update happens first, but the Redis block/unblock runs only after the audit and stream publish succeed. If either side effect throws, a suspended/banned user keeps authenticating on existing access tokens because `jwt.strategy.ts` only checks the Redis flag.
  >
  >
  > <details>
  > <summary>🛡️ Suggested fix</summary>
  >
  > ```diff
  >      const action = statusActions[status];
  >      if (action) {
  > +      if (action.revoke) {
  > +        await Promise.all([
  > +          this.sessionService.revokeAllUserSessions(id),
  > +          this.sessionService.blockUser(id),
  > +        ]);
  > +      }
  > +      if (action.unblock) {
  > +        await this.sessionService.unblockUser(id);
  > +      }
  >        await Promise.all([
  >          this.recordAudit(adminId, action.audit, undefined, undefined, auditMeta),
  >          this.redisStreams.publish(action.event, eventPayload),
  >        ]);
  > -      if (action.revoke) {
  > -        await this.sessionService.revokeAllUserSessions(id);
  > -        await this.sessionService.blockUser(id);
  > -      }
  > -      if (action.unblock) {
  > -        await this.sessionService.unblockUser(id);
  > -      }
  >      }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:medusa:grasshopper -->

- [x] Type Check failing — CI
  - [x] `Cannot find name 'PaginatedResponse'` in services/market/src/listings/listings.service.ts:195
  - [x] `Cannot find name 'PaginatedResponse'` in services/market/src/listings/listings.service.ts:213
  - [x] `Cannot find name 'PaginatedResponse'` in services/market/src/listings/listings.service.ts:236

- [x] Security Audit failing — CI
  - [x] Prototype Pollution via parse() in flatted <=3.4.1 (high severity, via eslint > file-entry-cache > flat-cache > flatted)

## Not Worth Fixing

- [ ] ~~Use exact blocked-flag matching instead of truthy check — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M51qUGz -->
  - _Reason: Our code only ever stores `'1'` via `blockUser()`. A truthy check is correct here — `'0'` and `'false'` are never written to this key. The suggested `=== '1'` adds no real safety._
  > **services/identity/src/auth/strategies/jwt.strategy.ts:41**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Use exact blocked-flag matching instead of truthy check.**
  >
  > `if (isBlocked)` will suspend on any non-empty string (e.g. `'0'`, `'false'`). Match the Redis contract explicitly (`'1'`) to avoid accidental lockouts.
  >
  >
  > <details>
  > <summary>Suggested fix</summary>
  >
  > ```diff
  > -    if (isBlocked) {
  > +    if (isBlocked === '1') {
  >        throw new UnauthorizedException('Account has been suspended');
  >      }
  > ```
  > </details>
  >
  > <!-- fingerprinting:phantom:poseidon:hawk -->
