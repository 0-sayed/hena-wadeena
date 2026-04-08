import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, type PriceAlertTriggeredPayload } from '@hena-wadeena/types';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull, lt, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { commodities } from '../db/schema/commodities';
import { priceAlertSubscriptions } from '../db/schema/price-alert-subscriptions';
import type {
  InsertPriceAlertSubscription,
  PriceAlertSubscription,
} from '../db/schema/price-alert-subscriptions';
import { isForeignKeyViolation, isUniqueViolation } from '../shared/error-helpers';
import { firstOrThrow } from '../shared/query-helpers';

import type { CreatePriceAlertDto } from './dto/create-price-alert.dto';
import type { UpdatePriceAlertDto } from './dto/update-price-alert.dto';

@Injectable()
export class PriceAlertsService {
  private readonly logger = new Logger(PriceAlertsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async create(userId: string, dto: CreatePriceAlertDto): Promise<PriceAlertSubscription> {
    try {
      const rows = await this.db
        .insert(priceAlertSubscriptions)
        .values({
          userId,
          commodityId: dto.commodityId,
          thresholdPrice: dto.thresholdPrice,
          direction: dto.direction as PriceAlertSubscription['direction'],
        })
        .returning();
      return firstOrThrow(rows);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Alert subscription already exists for this commodity and direction',
        );
      }
      if (isForeignKeyViolation(err)) {
        throw new NotFoundException('Commodity not found');
      }
      throw err;
    }
  }

  async findAllForUser(userId: string) {
    return this.db
      .select({
        id: priceAlertSubscriptions.id,
        userId: priceAlertSubscriptions.userId,
        commodityId: priceAlertSubscriptions.commodityId,
        thresholdPrice: priceAlertSubscriptions.thresholdPrice,
        direction: priceAlertSubscriptions.direction,
        isActive: priceAlertSubscriptions.isActive,
        lastTriggeredAt: priceAlertSubscriptions.lastTriggeredAt,
        createdAt: priceAlertSubscriptions.createdAt,
        commodityNameAr: commodities.nameAr,
      })
      .from(priceAlertSubscriptions)
      .innerJoin(commodities, eq(priceAlertSubscriptions.commodityId, commodities.id))
      .where(eq(priceAlertSubscriptions.userId, userId))
      .orderBy(asc(priceAlertSubscriptions.createdAt));
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePriceAlertDto,
  ): Promise<PriceAlertSubscription> {
    await this.ensureOwnership(id, userId);

    const updates: Partial<InsertPriceAlertSubscription> = {};
    if (dto.thresholdPrice !== undefined) updates.thresholdPrice = dto.thresholdPrice;
    if (dto.direction !== undefined)
      updates.direction = dto.direction as PriceAlertSubscription['direction'];

    try {
      const rows = await this.db
        .update(priceAlertSubscriptions)
        .set(updates)
        .where(eq(priceAlertSubscriptions.id, id))
        .returning();
      return firstOrThrow(rows);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Alert subscription already exists for this commodity and direction',
        );
      }
      throw err;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.ensureOwnership(id, userId);
    await this.db.delete(priceAlertSubscriptions).where(eq(priceAlertSubscriptions.id, id));
  }

  async evaluateForCommodity(
    commodityId: string,
    newPrice: number,
    recordedAt: Date,
  ): Promise<void> {
    const [commodity] = await this.db
      .select({ nameAr: commodities.nameAr, nameEn: commodities.nameEn })
      .from(commodities)
      .where(eq(commodities.id, commodityId))
      .limit(1);

    if (!commodity) return;

    const subs = await this.db
      .select()
      .from(priceAlertSubscriptions)
      .where(
        and(
          eq(priceAlertSubscriptions.commodityId, commodityId),
          eq(priceAlertSubscriptions.isActive, true),
          or(
            isNull(priceAlertSubscriptions.lastTriggeredAt),
            lt(priceAlertSubscriptions.lastTriggeredAt, recordedAt),
          ),
        ),
      );

    await Promise.all(
      subs
        .filter((sub) =>
          sub.direction === 'above'
            ? newPrice >= sub.thresholdPrice
            : newPrice <= sub.thresholdPrice,
        )
        .map(async (sub) => {
          await this.redisStreams.publish(EVENTS.PRICE_ALERT_TRIGGERED, {
            userId: sub.userId,
            commodityId,
            commodityNameAr: commodity.nameAr,
            commodityNameEn: commodity.nameEn ?? commodity.nameAr,
            thresholdPrice: String(sub.thresholdPrice),
            actualPrice: String(newPrice),
            direction: sub.direction,
          } satisfies PriceAlertTriggeredPayload);

          await this.db
            .update(priceAlertSubscriptions)
            .set({ lastTriggeredAt: recordedAt })
            .where(eq(priceAlertSubscriptions.id, sub.id));
        }),
    );
  }

  private async ensureOwnership(id: string, userId: string): Promise<void> {
    const [row] = await this.db
      .select({ userId: priceAlertSubscriptions.userId })
      .from(priceAlertSubscriptions)
      .where(eq(priceAlertSubscriptions.id, id))
      .limit(1);

    if (row?.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }
  }
}
