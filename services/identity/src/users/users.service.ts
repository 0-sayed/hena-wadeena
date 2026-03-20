import {
  DRIZZLE_CLIENT,
  RedisStreamsService,
  andRequired,
  escapeLike,
  firstOrThrow,
  paginate,
} from '@hena-wadeena/nest-common';
import { EVENTS, UserStatus } from '@hena-wadeena/types';
import type { EventName, PaginatedResponse } from '@hena-wadeena/types';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { auditEvents, users } from '../db/schema/index';
import { SessionService } from '../session/session.service';

type AuditEventType = typeof auditEvents.$inferInsert.eventType;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly sessionService: SessionService,
    private readonly redisStreams: RedisStreamsService,
  ) {}

  async findByEmail(email: string): Promise<typeof users.$inferSelect | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(andRequired(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findById(id: string): Promise<typeof users.$inferSelect | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(andRequired(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(query: {
    search?: string;
    role?: string;
    status?: string;
    offset?: number;
    limit?: number;
    sort?: string;
  }): Promise<PaginatedResponse<Omit<typeof users.$inferSelect, 'passwordHash' | 'deletedAt'>>> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const filters = this.buildFilters(query);
    const orderBy = this.buildSort(query.sort);

    const [countResult, data] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(filters),
      this.db.select().from(users).where(filters).orderBy(orderBy).limit(limit).offset(offset),
    ]);

    const total = countResult[0]?.count ?? 0;
    const publicData = data.map(({ passwordHash, deletedAt, ...safe }) => {
      void passwordHash;
      void deletedAt;
      return safe;
    });
    return paginate(publicData, total, offset, limit);
  }

  async create(data: { email: string; fullName: string; passwordHash: string; role: string }) {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: data.role as typeof users.$inferInsert.role,
      })
      .returning();
    if (!user) throw new InternalServerErrorException('Insert did not return a row');
    return user;
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string; language?: string },
  ) {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async updateLastLogin(id: string) {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async changeRole(id: string, role: string, adminId: string) {
    const user = await this.findByIdOrThrow(id);
    const oldRole = user.role;

    const rows = await this.db
      .update(users)
      .set({ role: role as typeof users.$inferInsert.role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // Revoke sessions so the user must re-authenticate with the new role in JWT
    await Promise.all([
      this.sessionService.revokeAllUserSessions(id),
      this.sessionService.blockUser(id),
    ]);

    await Promise.all([
      this.recordAudit(adminId, 'role_changed', undefined, undefined, {
        targetUserId: id,
        oldRole,
        newRole: role,
      }),
      this.redisStreams.publish(EVENTS.USER_ROLE_CHANGED, {
        userId: id,
        adminId,
        oldRole,
        newRole: role,
      }),
    ]);

    return firstOrThrow(rows);
  }

  async changeStatus(id: string, status: string, adminId: string, reason?: string) {
    const user = await this.findByIdOrThrow(id);
    const previousStatus = user.status;

    const rows = await this.db
      .update(users)
      .set({ status: status as typeof users.$inferInsert.status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    const auditMeta = { targetUserId: id, previousStatus, ...(reason ? { reason } : {}) };
    const eventPayload: Record<string, string> = { userId: id, adminId };
    if (reason) eventPayload.reason = reason;

    const statusActions: Record<
      string,
      { audit: AuditEventType; event: EventName; revoke?: boolean; unblock?: boolean }
    > = {
      [UserStatus.SUSPENDED]: {
        audit: 'account_suspended',
        event: EVENTS.USER_SUSPENDED,
        revoke: true,
      },
      [UserStatus.BANNED]: { audit: 'account_banned', event: EVENTS.USER_BANNED, revoke: true },
      [UserStatus.ACTIVE]: {
        audit: 'account_activated',
        event: EVENTS.USER_ACTIVATED,
        unblock: true,
      },
    };
    const action = statusActions[status];
    if (action) {
      if (action.revoke) {
        await Promise.all([
          this.sessionService.revokeAllUserSessions(id),
          this.sessionService.blockUser(id),
        ]);
      }
      if (action.unblock) {
        await this.sessionService.unblockUser(id);
      }
      await Promise.all([
        this.recordAudit(adminId, action.audit, undefined, undefined, auditMeta),
        this.redisStreams.publish(action.event, eventPayload),
      ]);
    }

    return firstOrThrow(rows);
  }

  async softDelete(id: string, adminId: string) {
    await this.findByIdOrThrow(id);

    await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(andRequired(eq(users.id, id), isNull(users.deletedAt)));

    await Promise.all([
      this.sessionService.revokeAllUserSessions(id).then(() => this.sessionService.blockUser(id)),
      this.recordAudit(adminId, 'account_deleted', undefined, undefined, { targetUserId: id }),
      this.redisStreams.publish(EVENTS.USER_DELETED, { userId: id, adminId }),
    ]);
  }

  private buildFilters(query: { search?: string; role?: string; status?: string }): SQL {
    const conditions: (SQL | undefined)[] = [isNull(users.deletedAt)];

    if (query.role !== undefined) conditions.push(eq(users.role, query.role as never));
    if (query.status !== undefined) conditions.push(eq(users.status, query.status as never));

    if (query.search) {
      const pattern = `%${escapeLike(query.search)}%`;
      conditions.push(
        or(
          ilike(users.fullName, pattern),
          ilike(users.email, pattern),
          ilike(users.displayName, pattern),
        ),
      );
    }

    return andRequired(...conditions);
  }

  private buildSort(sort?: string) {
    if (!sort) return desc(users.createdAt);
    const [field, direction] = sort.split('|');
    switch (field) {
      case 'created_at':
        return direction === 'asc' ? asc(users.createdAt) : desc(users.createdAt);
      case 'full_name':
        return direction === 'asc' ? asc(users.fullName) : desc(users.fullName);
      case 'last_login_at':
        return direction === 'asc' ? asc(users.lastLoginAt) : desc(users.lastLoginAt);
      default:
        return desc(users.createdAt);
    }
  }

  private async recordAudit(
    userId: string | null,
    eventType: AuditEventType,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.db.insert(auditEvents).values({
      userId,
      eventType,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: metadata ?? null,
    });
  }
}
