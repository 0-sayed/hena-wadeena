import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { EVENTS } from '@hena-wadeena/types';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { pointsOfInterest } from '../db/schema/index';
import { distanceTo, makePoint, withinRadius } from '../utils/postgis';
import { escapeLike } from '../utils/query';

import type { CreatePoiDto, PoiFiltersDto } from './dto';

type Poi = typeof pointsOfInterest.$inferSelect;

@Injectable()
export class PoisService {
  private readonly logger = new Logger(PoisService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async findAll(filters: PoiFiltersDto): Promise<PaginatedResponse<Poi>> {
    const where = this.buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;

    let orderBy: SQL = sql`${pointsOfInterest.createdAt} DESC`;
    if (filters.lat != null && filters.lng != null) {
      const point = makePoint(filters.lng, filters.lat);
      orderBy = distanceTo(pointsOfInterest.location, point);
    }

    const [data, countRows] = await Promise.all([
      this.db
        .select()
        .from(pointsOfInterest)
        .where(where)
        .orderBy(orderBy)
        .limit(filters.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(pointsOfInterest).where(where),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data,
      total,
      page: filters.page,
      limit: filters.limit,
      hasMore: offset + filters.limit < total,
    };
  }

  async findById(id: string): Promise<Poi> {
    const [row] = await this.db
      .select()
      .from(pointsOfInterest)
      .where(
        and(
          eq(pointsOfInterest.id, id),
          eq(pointsOfInterest.status, 'approved'),
          isNull(pointsOfInterest.deletedAt),
        ),
      );

    if (!row) {
      throw new NotFoundException('POI not found');
    }

    return row;
  }

  async create(dto: CreatePoiDto, userId: string): Promise<Poi> {
    const [row] = await this.db
      .insert(pointsOfInterest)
      .values({
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        description: dto.description,
        category: dto.category,
        location: { x: dto.location.lng, y: dto.location.lat },
        address: dto.address,
        phone: dto.phone,
        website: dto.website,
        images: dto.images,
        status: 'pending',
        submittedBy: userId,
      })
      .returning();

    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async approve(id: string, adminId: string): Promise<Poi> {
    await this.findByIdInternal(id);

    const [approved] = await this.db
      .update(pointsOfInterest)
      .set({
        status: 'approved',
        approvedBy: adminId,
        updatedAt: new Date(),
      })
      .where(and(eq(pointsOfInterest.id, id), eq(pointsOfInterest.status, 'pending')))
      .returning();

    if (!approved) throw new BadRequestException('POI is not pending or was already processed');

    this.redisStreams
      .publish(EVENTS.POI_APPROVED, {
        poiId: approved.id,
        nameAr: approved.nameAr,
        nameEn: approved.nameEn ?? '',
        category: approved.category,
        location: JSON.stringify(approved.location),
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to publish poi.approved event', err);
      });

    return approved;
  }

  async reject(id: string, reason?: string): Promise<Poi> {
    await this.findByIdInternal(id);

    const [row] = await this.db
      .update(pointsOfInterest)
      .set({ status: 'rejected', rejectionReason: reason ?? null, updatedAt: new Date() })
      .where(and(eq(pointsOfInterest.id, id), eq(pointsOfInterest.status, 'pending')))
      .returning();

    if (!row) throw new BadRequestException('POI is not pending or was already processed');
    return row;
  }

  private async findByIdInternal(id: string): Promise<Poi> {
    const [row] = await this.db.select().from(pointsOfInterest).where(eq(pointsOfInterest.id, id));

    if (!row) {
      throw new NotFoundException('POI not found');
    }

    return row;
  }

  private buildWhereClause(filters: PoiFiltersDto): SQL | undefined {
    const conditions: SQL[] = [];

    // Default to approved + not deleted for non-admin queries
    const status = filters.status ?? 'approved';
    conditions.push(eq(pointsOfInterest.status, status));

    if (status === 'approved') {
      conditions.push(isNull(pointsOfInterest.deletedAt));
    }

    if (filters.category) {
      conditions.push(eq(pointsOfInterest.category, filters.category));
    }

    if (filters.q) {
      const escaped = escapeLike(filters.q);
      const searchCond = or(
        ilike(pointsOfInterest.nameAr, `%${escaped}%`),
        ilike(pointsOfInterest.nameEn, `%${escaped}%`),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    if (filters.lat != null && filters.lng != null) {
      const point = makePoint(filters.lng, filters.lat);
      conditions.push(withinRadius(pointsOfInterest.location, point, filters.radius));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
