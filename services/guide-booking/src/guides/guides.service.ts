import { DRIZZLE_CLIENT, S3Service, generateId } from '@hena-wadeena/nest-common';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { guides } from '../db/schema/index';
import { escapeLike, pickDefined } from '../utils/query';

import type { CreateGuideDto, GuideFiltersDto, GuideUploadUrlDto, UpdateGuideDto } from './dto';

type Guide = typeof guides.$inferSelect;

@Injectable()
export class GuidesService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly s3: S3Service,
  ) {}

  async resolveGuideId(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ id: guides.id })
      .from(guides)
      .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)))
      .limit(1);

    if (!row) throw new NotFoundException('Guide profile not found');
    return row.id;
  }

  private buildFilters(query: GuideFiltersDto, includeAll = false): SQL | undefined {
    const conditions: SQL[] = [];

    if (!includeAll) {
      conditions.push(eq(guides.active, true));
      conditions.push(eq(guides.licenseVerified, true));
      conditions.push(isNull(guides.deletedAt));
    }

    if (query.language) {
      conditions.push(sql`${guides.languages} @> ARRAY[${query.language}]::text[]`);
    }

    if (query.specialty) {
      conditions.push(sql`${guides.specialties} @> ARRAY[${query.specialty}]::text[]`);
    }

    if (query.area) {
      conditions.push(sql`${guides.areasOfOperation} @> ARRAY[${query.area}]::text[]`);
    }

    if (query.minRating != null) {
      conditions.push(gte(guides.ratingAvg, query.minRating));
    }

    if (query.minPrice != null) {
      conditions.push(gte(guides.basePrice, query.minPrice));
    }

    if (query.maxPrice != null) {
      conditions.push(lte(guides.basePrice, query.maxPrice));
    }

    if (query.verified != null) {
      conditions.push(eq(guides.licenseVerified, query.verified));
    }

    if (query.search) {
      const escaped = escapeLike(query.search);
      const searchCond = or(
        ilike(guides.bioAr, `%${escaped}%`),
        ilike(guides.bioEn, `%${escaped}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private async countGuides(where: SQL | undefined): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(guides)
      .where(where);
    return row?.total ?? 0;
  }

  // ─── CRUD methods (to be implemented in next iteration) ─────────────────────

  async create(dto: CreateGuideDto, userId: string): Promise<Guide> {
    // Check for duplicate userId
    const [existingUser] = await this.db
      .select({ id: guides.id })
      .from(guides)
      .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)))
      .limit(1);

    if (existingUser) throw new ConflictException('Guide profile already exists for this user');

    // Check for duplicate licenseNumber
    const [existingLicense] = await this.db
      .select({ id: guides.id })
      .from(guides)
      .where(and(eq(guides.licenseNumber, dto.licenseNumber), isNull(guides.deletedAt)))
      .limit(1);

    if (existingLicense) throw new ConflictException('License number is already in use');

    const [row] = await this.db
      .insert(guides)
      .values({
        id: generateId(),
        userId,
        licenseNumber: dto.licenseNumber,
        basePrice: dto.basePrice,
        bioAr: dto.bioAr,
        bioEn: dto.bioEn,
        languages: dto.languages ?? [],
        specialties: dto.specialties ?? [],
        profileImage: dto.profileImage,
        coverImage: dto.coverImage,
        areasOfOperation: dto.areasOfOperation ?? [],
      })
      .returning();

    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async findAll(query: GuideFiltersDto) {
    const where = this.buildFilters(query);
    const offset = (query.page - 1) * query.limit;

    const packageCountSq = sql<number>`(
      SELECT COUNT(*)::int
      FROM guide_booking.tour_packages tp
      WHERE tp.guide_id = ${guides.id}
        AND tp.status = 'active'
        AND tp.deleted_at IS NULL
    )`;

    const [data, total] = await Promise.all([
      this.db
        .select({
          id: guides.id,
          bioAr: guides.bioAr,
          bioEn: guides.bioEn,
          profileImage: guides.profileImage,
          languages: guides.languages,
          specialties: guides.specialties,
          areasOfOperation: guides.areasOfOperation,
          basePrice: guides.basePrice,
          ratingAvg: guides.ratingAvg,
          ratingCount: guides.ratingCount,
          licenseVerified: guides.licenseVerified,
          packageCount: packageCountSq,
        })
        .from(guides)
        .where(where)
        .orderBy(desc(guides.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.countGuides(where),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: offset + query.limit < total,
    };
  }

  async findById(id: string) {
    const packageCountSq = sql<number>`(
      SELECT COUNT(*)::int
      FROM guide_booking.tour_packages tp
      WHERE tp.guide_id = ${guides.id}
        AND tp.status = 'active'
        AND tp.deleted_at IS NULL
    )`;

    const reviewCountSq = sql<number>`(
      SELECT COUNT(*)::int
      FROM guide_booking.guide_reviews gr
      WHERE gr.guide_id = ${guides.id}
    )`;

    const [row] = await this.db
      .select({
        id: guides.id,
        userId: guides.userId,
        bioAr: guides.bioAr,
        bioEn: guides.bioEn,
        profileImage: guides.profileImage,
        coverImage: guides.coverImage,
        languages: guides.languages,
        specialties: guides.specialties,
        areasOfOperation: guides.areasOfOperation,
        licenseNumber: guides.licenseNumber,
        licenseVerified: guides.licenseVerified,
        basePrice: guides.basePrice,
        ratingAvg: guides.ratingAvg,
        ratingCount: guides.ratingCount,
        active: guides.active,
        createdAt: guides.createdAt,
        updatedAt: guides.updatedAt,
        packageCount: packageCountSq,
        reviewCount: reviewCountSq,
      })
      .from(guides)
      .where(
        and(
          eq(guides.id, id),
          eq(guides.active, true),
          eq(guides.licenseVerified, true),
          isNull(guides.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException(`Guide not found: ${id}`);
    return row;
  }

  async findGuidePackages(guideId: string, page: number, limit: number) {
    // Verify guide exists and is active
    const [guideRow] = await this.db
      .select({ id: guides.id })
      .from(guides)
      .where(
        and(
          eq(guides.id, guideId),
          eq(guides.active, true),
          eq(guides.licenseVerified, true),
          isNull(guides.deletedAt),
        ),
      )
      .limit(1);

    if (!guideRow) throw new NotFoundException(`Guide not found: ${guideId}`);

    const offset = (page - 1) * limit;

    const [rows, [countRow]] = await Promise.all([
      this.db.execute(sql`
        SELECT
          tp.id,
          tp.title_ar AS "titleAr",
          tp.title_en AS "titleEn",
          tp.description,
          tp.duration_hours AS "durationHours",
          tp.max_people AS "maxPeople",
          tp.price,
          tp.includes,
          tp.images,
          tp.status,
          tp.created_at AS "createdAt",
          tp.updated_at AS "updatedAt",
          COALESCE(
            ARRAY_AGG(a.slug ORDER BY tpa.sort_order)
              FILTER (WHERE a.id IS NOT NULL AND a.deleted_at IS NULL),
            '{}'
          ) AS "attractionSlugs"
        FROM guide_booking.tour_packages tp
        LEFT JOIN guide_booking.tour_package_attractions tpa ON tpa.package_id = tp.id
        LEFT JOIN guide_booking.attractions a ON a.id = tpa.attraction_id
        WHERE tp.guide_id = ${guideId}
          AND tp.status = 'active'
          AND tp.deleted_at IS NULL
        GROUP BY tp.id
        ORDER BY tp.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM guide_booking.tour_packages tp
        WHERE tp.guide_id = ${guideId}
          AND tp.status = 'active'
          AND tp.deleted_at IS NULL
      `),
    ]);

    const total = (countRow as { total: number }).total;

    return {
      data: rows as unknown[],
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };
  }

  async findMyProfile(userId: string) {
    const guideId = await this.resolveGuideId(userId);
    return this.findById(guideId);
  }

  async update(userId: string, dto: UpdateGuideDto): Promise<Guide> {
    const guideId = await this.resolveGuideId(userId);

    const [row] = await this.db
      .update(guides)
      .set({ ...pickDefined(dto), updatedAt: new Date() })
      .where(and(eq(guides.id, guideId), isNull(guides.deletedAt)))
      .returning();

    if (!row) throw new NotFoundException('Guide profile not found');
    return row;
  }

  async getUploadUrl(userId: string, dto: GuideUploadUrlDto) {
    const guideId = await this.resolveGuideId(userId);
    const key = `guides/${guideId}/${dto.imageType}/${generateId()}-${dto.filename}`;
    return this.s3.getPresignedUploadUrl({ key, contentType: dto.contentType });
  }

  async adminFindAll(
    query: GuideFiltersDto,
    status?: 'active' | 'inactive' | 'deleted' | 'unverified',
  ) {
    const baseWhere = this.buildFilters(query, true);

    let statusCondition: SQL | undefined;
    if (status === 'active') {
      statusCondition = and(eq(guides.active, true), isNull(guides.deletedAt));
    } else if (status === 'inactive') {
      statusCondition = and(eq(guides.active, false), isNull(guides.deletedAt));
    } else if (status === 'deleted') {
      statusCondition = isNotNull(guides.deletedAt);
    } else if (status === 'unverified') {
      statusCondition = and(eq(guides.licenseVerified, false), isNull(guides.deletedAt));
    }

    const where = and(baseWhere, statusCondition);
    const offset = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.db
        .select()
        .from(guides)
        .where(where)
        .orderBy(desc(guides.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.countGuides(where),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: offset + query.limit < total,
    };
  }

  async adminVerify(id: string, verified: boolean): Promise<Guide> {
    const [row] = await this.db
      .update(guides)
      .set({ licenseVerified: verified, updatedAt: new Date() })
      .where(and(eq(guides.id, id), isNull(guides.deletedAt)))
      .returning();

    if (!row) throw new NotFoundException(`Guide not found: ${id}`);
    return row;
  }

  async adminSetStatus(id: string, active: boolean): Promise<Guide> {
    const [row] = await this.db
      .update(guides)
      .set({ active, updatedAt: new Date() })
      .where(and(eq(guides.id, id), isNull(guides.deletedAt)))
      .returning();

    if (!row) throw new NotFoundException(`Guide not found: ${id}`);
    return row;
  }
}
