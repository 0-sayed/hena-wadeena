import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Redis } from 'ioredis';

import { authTokens } from '../db/schema/index';

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async revokeAllUserSessions(userId: string): Promise<void> {
    // Revoke all refresh tokens — used by logout, password change, and admin actions
    await this.db
      .update(authTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), isNull(authTokens.revokedAt)));
  }

  async blockUser(userId: string): Promise<void> {
    // Set a "user blocked" flag in Redis — checked by JwtStrategy on every request.
    // Persists until explicitly removed via unblockUser() (e.g. when admin reactivates account).
    // ONLY called by admin actions (suspend/ban/delete), NOT by password change or logout.
    await this.redis.set(`blocked:${userId}`, '1');
  }

  async unblockUser(userId: string): Promise<void> {
    await this.redis.del(`blocked:${userId}`);
  }

  async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
    }
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.db
      .update(authTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(authTokens.tokenHash, tokenHash), isNull(authTokens.revokedAt)));
  }
}
