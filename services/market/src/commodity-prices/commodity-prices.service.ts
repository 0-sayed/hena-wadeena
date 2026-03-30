import { DRIZZLE_CLIENT, REDIS_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, PaginatedResponse } from '@hena-wadeena/types';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SQL, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';

import { commodities } from '../db/schema/commodities';
import { commodityPrices } from '../db/schema/commodity-prices';
import { isForeignKeyViolation, isUniqueViolation } from '../shared/error-helpers';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';
import { scanAndDelete } from '../shared/redis-helpers';

import { BatchCreatePricesDto } from './dto/batch-create-prices.dto';
import { CreateCommodityPriceDto } from './dto/create-commodity-price.dto';
import { CreateCommodityDto } from './dto/create-commodity.dto';
import { QueryPriceHistoryDto } from './dto/query-price-history.dto';
import { QueryPriceIndexDto } from './dto/query-price-index.dto';
import { UpdateCommodityPriceDto } from './dto/update-commodity-price.dto';
import { UpdateCommodityDto } from './dto/update-commodity.dto';

type Commodity = typeof commodities.$inferSelect;
type InsertCommodity = typeof commodities.$inferInsert;
type CommodityPrice = typeof commodityPrices.$inferSelect;
type InsertCommodityPrice = typeof commodityPrices.$inferInsert;

type LatestPriceRow = Record<string, unknown> & {
  id: string;
  price: number;
  price_type: string;
  region: string;
  recorded_at: Date;
};

type PriceIndexRow = Record<string, unknown> & {
  commodity_id: string;
  name_ar: string;
  name_en: string | null;
  unit: string;
  category: string;
  latest_price: number;
  previous_price: number | null;
  price_type: string;
  region: string;
  recorded_at: Date;
};

type PriceSummaryRow = Record<string, unknown> & {
  total_commodities: string;
  total_price_entries: string;
  last_updated: Date | null;
};

type TopMoverRow = Record<string, unknown> & {
  commodity_id: string;
  name_ar: string;
  latest_price: number;
  previous_price: number | null;
  change_percent: string | null;
};

type CategoryAvgRow = Record<string, unknown> & {
  category: string;
  avg_price: string;
  commodity_count: string;
};

type PriceHistoryRow = Record<string, unknown> & {
  date: string;
  avg_price: string;
  min_price: number;
  max_price: number;
  sample_count: string;
};

function formatPriceIndexRow(r: PriceIndexRow) {
  const changePiasters = r.previous_price !== null ? r.latest_price - r.previous_price : null;
  const changePercent =
    r.previous_price !== null && r.previous_price !== 0 && changePiasters !== null
      ? Math.round((changePiasters / r.previous_price) * 10000) / 100
      : null;

  return {
    commodity: {
      id: r.commodity_id,
      nameAr: r.name_ar,
      nameEn: r.name_en,
      unit: r.unit,
      category: r.category,
    },
    latestPrice: r.latest_price,
    previousPrice: r.previous_price,
    changePiasters,
    changePercent,
    region: r.region,
    priceType: r.price_type,
    recordedAt: r.recorded_at,
  };
}

@Injectable()
export class CommodityPricesService {
  private readonly logger = new Logger(CommodityPricesService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  // --- Commodity CRUD ---

  async createCommodity(dto: CreateCommodityDto, _adminId: string): Promise<Commodity> {
    const rows = await this.db
      .insert(commodities)
      .values({
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        category: dto.category as InsertCommodity['category'],
        unit: dto.unit as InsertCommodity['unit'],
        iconUrl: dto.iconUrl,
        sortOrder: dto.sortOrder,
      })
      .returning();
    return firstOrThrow(rows);
  }

  async updateCommodity(id: string, dto: UpdateCommodityDto): Promise<Commodity> {
    const updates: Partial<InsertCommodity> = { updatedAt: new Date() };
    if (dto.nameAr !== undefined) updates.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) updates.nameEn = dto.nameEn;
    if (dto.category !== undefined) updates.category = dto.category as InsertCommodity['category'];
    if (dto.unit !== undefined) updates.unit = dto.unit as InsertCommodity['unit'];
    if (dto.iconUrl !== undefined) updates.iconUrl = dto.iconUrl;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .update(commodities)
      .set(updates)
      .where(eq(commodities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Commodity not found');

    this.invalidateCommodityCache(id);
    return updated;
  }

  async deactivateCommodity(id: string): Promise<Commodity> {
    const [updated] = await this.db
      .update(commodities)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(commodities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Commodity not found');

    this.invalidateCommodityCache(id);
    return updated;
  }

  async findAllCommodities(query?: { category?: string }): Promise<Commodity[]> {
    const conditions: SQL[] = [eq(commodities.isActive, true)];
    if (query?.category) {
      conditions.push(eq(commodities.category, query.category as InsertCommodity['category']));
    }
    return this.db
      .select()
      .from(commodities)
      .where(andRequired(...conditions))
      .orderBy(asc(commodities.sortOrder), asc(commodities.createdAt));
  }

  async findCommodityById(id: string) {
    const cacheKey = `mkt:commodity:${id}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.error('Redis read failed, falling back to DB', err);
    }

    const [commodity] = await this.db
      .select()
      .from(commodities)
      .where(eq(commodities.id, id))
      .limit(1);

    if (!commodity) throw new NotFoundException('Commodity not found');

    const latestPricesByRegion = await this.db.execute<LatestPriceRow>(sql`
      SELECT DISTINCT ON (region)
        id, price, price_type, region, recorded_at
      FROM market.commodity_prices
      WHERE commodity_id = ${id}
        AND deleted_at IS NULL
      ORDER BY region, recorded_at DESC
    `);

    const result = { ...commodity, latestPricesByRegion: [...latestPricesByRegion] };

    this.redis.set(cacheKey, JSON.stringify(result), 'EX', 1800).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return result;
  }

  // --- Price Entry ---

  async createPrice(dto: CreateCommodityPriceDto, adminId: string): Promise<CommodityPrice> {
    try {
      const rows = await this.db
        .insert(commodityPrices)
        .values({
          commodityId: dto.commodityId,
          price: dto.price,
          priceType: dto.priceType as InsertCommodityPrice['priceType'],
          region: dto.region,
          source: dto.source,
          notes: dto.notes,
          recordedAt: new Date(dto.recordedAt),
          recordedBy: adminId,
        })
        .returning();

      const entry = firstOrThrow(rows);

      this.invalidatePriceCache(dto.commodityId);

      // Best-effort enrichment: don't let a post-write failure hide the committed write
      this.enrichAndPublishPrice(dto.commodityId, dto.region, dto.price, dto.priceType);

      return entry;
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new NotFoundException('Commodity not found');
      }
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'A price entry already exists for this commodity, region, and type on this day',
        );
      }
      throw err;
    }
  }

  async batchCreatePrices(dto: BatchCreatePricesDto, adminId: string): Promise<CommodityPrice[]> {
    const recordedAt = new Date(dto.recordedAt);

    let entries: CommodityPrice[];
    try {
      entries = await this.db.transaction(async (tx) => {
        const values = dto.entries.map((e) => ({
          commodityId: e.commodityId,
          price: e.price,
          priceType: e.priceType as InsertCommodityPrice['priceType'],
          region: e.region,
          source: dto.source,
          recordedAt,
          recordedBy: adminId,
        }));
        return tx.insert(commodityPrices).values(values).returning();
      });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new NotFoundException('Commodity not found');
      }
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'One or more entries duplicate an existing price for the same commodity, region, type, and day',
        );
      }
      throw err;
    }

    this.invalidatePriceCache();
    // Also evict per-commodity detail caches for all affected commodities
    const uniqueCommodityIds = [...new Set(entries.map((e) => e.commodityId))];
    for (const cid of uniqueCommodityIds) {
      this.redis.del(`mkt:commodity:${cid}`).catch((err: unknown) => {
        this.logger.error('Cache invalidation failed', err);
      });
    }

    // Best-effort enrichment: don't let post-write failures hide committed writes
    this.enrichAndPublishBatch(entries, uniqueCommodityIds);

    return entries;
  }

  async updatePrice(id: string, dto: UpdateCommodityPriceDto): Promise<CommodityPrice> {
    const updates: Partial<InsertCommodityPrice> = {};
    if (dto.price !== undefined) updates.price = dto.price;
    if (dto.priceType !== undefined)
      updates.priceType = dto.priceType as InsertCommodityPrice['priceType'];
    if (dto.region !== undefined) updates.region = dto.region;
    if (dto.source !== undefined) updates.source = dto.source;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.recordedAt !== undefined) updates.recordedAt = new Date(dto.recordedAt);

    try {
      const [updated] = await this.db
        .update(commodityPrices)
        .set(updates)
        .where(andRequired(eq(commodityPrices.id, id), isNull(commodityPrices.deletedAt)))
        .returning();

      if (!updated) throw new NotFoundException('Price entry not found');

      this.invalidatePriceCache(updated.commodityId);
      return updated;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'A price entry already exists for this commodity, region, and type on this day',
        );
      }
      throw err;
    }
  }

  async deletePrice(id: string): Promise<void> {
    const [deleted] = await this.db
      .update(commodityPrices)
      .set({ deletedAt: new Date() })
      .where(andRequired(eq(commodityPrices.id, id), isNull(commodityPrices.deletedAt)))
      .returning({ id: commodityPrices.id, commodityId: commodityPrices.commodityId });

    if (!deleted) throw new NotFoundException('Price entry not found');

    this.invalidatePriceCache(deleted.commodityId);
  }

  // --- Price Index ---

  async getPriceIndex(query: QueryPriceIndexDto): Promise<PaginatedResponse<unknown>> {
    // Ensure defaults for pagination - DTO validation may not apply defaults correctly
    const offset = (query.offset as number | undefined) ?? 0;
    const limit = (query.limit as number | undefined) ?? 20;
    const cacheKey = `mkt:price-index:${query.region ?? '*'}:${query.category ?? '*'}:${query.price_type ?? '*'}:${offset}:${limit}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as PaginatedResponse<unknown>;
      }
    } catch (err) {
      this.logger.error('Redis read failed, falling back to DB', err);
    }

    const categoryFilter = query.category ? sql`AND c.category = ${query.category}` : sql``;
    const regionFilter = query.region ? sql`AND cp.region = ${query.region}` : sql``;
    const priceTypeFilter = query.price_type ? sql`AND cp.price_type = ${query.price_type}` : sql``;

    const countRows = await this.db.execute<{ count: number }>(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT DISTINCT ON (cp.commodity_id, cp.region, cp.price_type) 1
        FROM market.commodity_prices cp
        JOIN market.commodities c ON c.id = cp.commodity_id
        WHERE cp.deleted_at IS NULL
          AND c.is_active = true
          ${categoryFilter}
          ${regionFilter}
          ${priceTypeFilter}
      ) sub
    `);

    const rows = await this.db.execute<PriceIndexRow>(sql`
      WITH latest AS (
        SELECT DISTINCT ON (cp.commodity_id, cp.region, cp.price_type)
          cp.commodity_id,
          cp.price       AS latest_price,
          cp.price_type,
          cp.region,
          cp.recorded_at,
          c.name_ar,
          c.name_en,
          c.unit,
          c.category
        FROM market.commodity_prices cp
        JOIN market.commodities c ON c.id = cp.commodity_id
        WHERE cp.deleted_at IS NULL
          AND c.is_active = true
          ${categoryFilter}
          ${regionFilter}
          ${priceTypeFilter}
        ORDER BY cp.commodity_id, cp.region, cp.price_type, cp.recorded_at DESC
      ),
      with_prev AS (
        SELECT
          l.*,
          (
            SELECT cp2.price
            FROM market.commodity_prices cp2
            WHERE cp2.commodity_id = l.commodity_id
              AND cp2.region = l.region
              AND cp2.price_type = l.price_type
              AND cp2.deleted_at IS NULL
              AND cp2.recorded_at < l.recorded_at
            ORDER BY cp2.recorded_at DESC
            LIMIT 1
          ) AS previous_price
        FROM latest l
      )
      SELECT
        commodity_id,
        name_ar,
        name_en,
        unit,
        category,
        latest_price,
        previous_price,
        price_type,
        region,
        recorded_at
      FROM with_prev
      ORDER BY commodity_id, region, price_type
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const formatted = [...rows].map(formatPriceIndexRow);
    const total = countRows[0]?.count ?? 0;
    const response = paginate(formatted, total, offset, limit);

    this.redis.set(cacheKey, JSON.stringify(response), 'EX', 3600).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return response;
  }

  async getPriceSummary() {
    const cacheKey = 'mkt:price-summary';
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.error('Redis read failed, falling back to DB', err);
    }

    const [[summary], topMovers, categoryAverages] = await Promise.all([
      this.db.execute<PriceSummaryRow>(sql`
        SELECT
          (SELECT COUNT(*)::text FROM market.commodities WHERE is_active = true)    AS total_commodities,
          (SELECT COUNT(*)::text FROM market.commodity_prices WHERE deleted_at IS NULL) AS total_price_entries,
          (SELECT MAX(recorded_at) FROM market.commodity_prices WHERE deleted_at IS NULL) AS last_updated
      `),
      this.db.execute<TopMoverRow>(sql`
        WITH latest AS (
          SELECT DISTINCT ON (commodity_id, region, price_type)
            cp.commodity_id,
            cp.price AS latest_price,
            cp.region,
            cp.price_type,
            cp.recorded_at,
            c.name_ar
          FROM market.commodity_prices cp
          JOIN market.commodities c ON c.id = cp.commodity_id
          WHERE cp.deleted_at IS NULL AND c.is_active = true
          ORDER BY commodity_id, region, price_type, recorded_at DESC
        ),
        with_prev AS (
          SELECT
            l.commodity_id,
            l.name_ar,
            l.latest_price,
            (
              SELECT cp2.price
              FROM market.commodity_prices cp2
              WHERE cp2.commodity_id = l.commodity_id
                AND cp2.region = l.region
                AND cp2.price_type = l.price_type
                AND cp2.deleted_at IS NULL
                AND cp2.recorded_at < l.recorded_at
              ORDER BY cp2.recorded_at DESC
              LIMIT 1
            ) AS previous_price
          FROM latest l
        )
        SELECT
          commodity_id,
          name_ar,
          latest_price,
          previous_price,
          CASE
            WHEN previous_price IS NOT NULL AND previous_price != 0
            THEN ROUND(((latest_price - previous_price)::numeric / previous_price) * 100, 2)::text
            ELSE NULL
          END AS change_percent
        FROM with_prev
        WHERE previous_price IS NOT NULL
        ORDER BY ABS(
          CASE WHEN previous_price != 0
            THEN ((latest_price - previous_price)::numeric / previous_price) * 100
            ELSE 0
          END
        ) DESC
        LIMIT 5
      `),
      this.db.execute<CategoryAvgRow>(sql`
        WITH latest AS (
          SELECT DISTINCT ON (commodity_id)
            cp.price,
            c.category,
            c.id AS commodity_id
          FROM market.commodity_prices cp
          JOIN market.commodities c ON c.id = cp.commodity_id
          WHERE cp.deleted_at IS NULL AND c.is_active = true
          ORDER BY commodity_id, cp.recorded_at DESC
        )
        SELECT
          category,
          ROUND(AVG(price))::text AS avg_price,
          COUNT(*)::text          AS commodity_count
        FROM latest
        GROUP BY category
      `),
    ]);

    const result = {
      totalCommodities: summary ? Number(summary.total_commodities) : 0,
      totalPriceEntries: summary ? Number(summary.total_price_entries) : 0,
      lastUpdated: summary?.last_updated ?? null,
      topMovers: [...topMovers].map((r) => ({
        commodity: { id: r.commodity_id, nameAr: r.name_ar },
        changePercent: r.change_percent !== null ? Number(r.change_percent) : null,
        direction:
          r.change_percent !== null ? (Number(r.change_percent) >= 0 ? 'up' : 'down') : null,
      })),
      categoryAverages: [...categoryAverages].map((r) => ({
        category: r.category,
        avgPrice: Math.round(Number(r.avg_price)),
        commodityCount: Number(r.commodity_count),
      })),
    };

    this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return result;
  }

  async getPriceHistory(commodityId: string, query: QueryPriceHistoryDto) {
    const [commodity] = await this.db
      .select({
        id: commodities.id,
        nameAr: commodities.nameAr,
        nameEn: commodities.nameEn,
        unit: commodities.unit,
      })
      .from(commodities)
      .where(eq(commodities.id, commodityId))
      .limit(1);

    if (!commodity) throw new NotFoundException('Commodity not found');

    const truncUnit = query.period === '90d' ? 'week' : query.period === '1y' ? 'month' : 'day';

    const regionFilter = query.region ? sql`AND region = ${query.region}` : sql``;
    const priceTypeFilter = query.price_type ? sql`AND price_type = ${query.price_type}` : sql``;

    const intervalMap: Record<string, string> = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year',
    };
    const interval = intervalMap[query.period] ?? '30 days';

    const rows = await this.db.execute<PriceHistoryRow>(sql`
      SELECT
        date_trunc(${sql.raw(`'${truncUnit}'`)}, recorded_at)::date::text AS date,
        ROUND(AVG(price))::text AS avg_price,
        MIN(price)              AS min_price,
        MAX(price)              AS max_price,
        COUNT(*)::text          AS sample_count
      FROM market.commodity_prices
      WHERE commodity_id = ${commodityId}
        AND deleted_at IS NULL
        AND recorded_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        ${regionFilter}
        ${priceTypeFilter}
      GROUP BY date_trunc(${sql.raw(`'${truncUnit}'`)}, recorded_at)
      ORDER BY date_trunc(${sql.raw(`'${truncUnit}'`)}, recorded_at) ASC
    `);

    return {
      commodity,
      data: [...rows].map((r) => ({
        date: r.date,
        avgPrice: Math.round(Number(r.avg_price)),
        minPrice: r.min_price,
        maxPrice: r.max_price,
        sampleCount: Number(r.sample_count),
      })),
      period: query.period,
      region: query.region ?? null,
      priceType: query.price_type ?? null,
    };
  }

  // --- Cache helpers ---

  private enrichAndPublishPrice(
    commodityId: string,
    region: string,
    price: number,
    priceType: string,
  ): void {
    (async () => {
      const commodityRow = await this.db
        .select({ nameAr: commodities.nameAr })
        .from(commodities)
        .where(eq(commodities.id, commodityId))
        .limit(1);

      await this.redisStreams.publish(EVENTS.COMMODITY_PRICE_UPDATED, {
        commodityId,
        nameAr: commodityRow[0]?.nameAr ?? '',
        region,
        price: String(price),
        priceType,
      });
    })().catch((err: unknown) => {
      this.logger.error('Post-write enrichment failed (write already committed)', err);
    });
  }

  private enrichAndPublishBatch(entries: CommodityPrice[], uniqueCommodityIds: string[]): void {
    (async () => {
      const commodityRows = await this.db
        .select({ id: commodities.id, nameAr: commodities.nameAr })
        .from(commodities)
        .where(inArray(commodities.id, uniqueCommodityIds));
      const nameMap = new Map(commodityRows.map((r) => [r.id, r.nameAr]));

      for (const entry of entries) {
        await this.redisStreams.publish(EVENTS.COMMODITY_PRICE_UPDATED, {
          commodityId: entry.commodityId,
          nameAr: nameMap.get(entry.commodityId) ?? '',
          region: entry.region,
          price: String(entry.price),
          priceType: entry.priceType,
        });
      }
    })().catch((err: unknown) => {
      this.logger.error('Post-write batch enrichment failed (writes already committed)', err);
    });
  }

  private invalidatePriceCache(commodityId?: string): void {
    const ops: Promise<unknown>[] = [
      scanAndDelete(this.redis, 'mkt:price-index:*'),
      this.redis.del('mkt:price-summary'),
    ];
    // Also evict the commodity detail cache so latestPricesByRegion stays fresh
    if (commodityId) {
      ops.push(this.redis.del(`mkt:commodity:${commodityId}`));
    }
    Promise.all(ops).catch((err: unknown) => {
      this.logger.error('Cache invalidation failed', err);
    });
  }

  private invalidateCommodityCache(id: string): void {
    // Evict per-commodity detail AND public price caches (name/category/active shown there)
    Promise.all([
      this.redis.del(`mkt:commodity:${id}`),
      scanAndDelete(this.redis, 'mkt:price-index:*'),
      this.redis.del('mkt:price-summary'),
    ]).catch((err: unknown) => {
      this.logger.error('Cache invalidation failed', err);
    });
  }
}
