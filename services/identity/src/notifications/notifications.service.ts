import { DRIZZLE_CLIENT, paginate, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';

import { notificationTypeEnum } from '../db/enums';
import * as schema from '../db/schema';
import { notifications } from '../db/schema/notifications';

import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { NotificationQueryDto } from './dto/notification-query.dto';

const UNREAD_CACHE_KEY = (userId: string) => `notif:unread:${userId}`;
const UNREAD_CACHE_TTL = 60; // seconds

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(dto: CreateNotificationDto & { userId: string }) {
    const [notification] = await this.db
      .insert(notifications)
      .values({
        userId: dto.userId,
        type: dto.type as (typeof notificationTypeEnum.enumValues)[number],
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        bodyAr: dto.bodyAr,
        bodyEn: dto.bodyEn,
        data: dto.data ?? null,
      })
      .returning();

    await this.bustUnreadCache(dto.userId);
    this.logger.debug(`Notification created for user ${dto.userId}: ${dto.type}`);
    return notification;
  }

  async findAllForUser(userId: string, query: NotificationQueryDto) {
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(notifications.userId, userId)];
    if (query.unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }

    const whereClause = and(...conditions);

    const [data, [totalRow], unreadCount] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(notifications).where(whereClause),
      this.getUnreadCount(userId),
    ]);

    return {
      ...paginate(data, totalRow?.count ?? 0, offset, query.limit),
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const cached = await this.redis.get(UNREAD_CACHE_KEY(userId));
    if (cached !== null) return Number(cached);

    const [row] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    const total = row?.count ?? 0;
    await this.redis.set(UNREAD_CACHE_KEY(userId), String(total), 'EX', UNREAD_CACHE_TTL);
    return total;
  }

  async markRead(id: string, userId: string) {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('Notification not found or already read');
    await this.bustUnreadCache(userId);
    return updated;
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    await this.bustUnreadCache(userId);
  }

  private async bustUnreadCache(userId: string) {
    await this.redis.del(UNREAD_CACHE_KEY(userId));
  }
}
