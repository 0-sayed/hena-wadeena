import { DRIZZLE_CLIENT, S3Service, generateId } from '@hena-wadeena/nest-common';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { attractions, tourPackageAttractions, tourPackages } from '../db/schema/index';
import { GuidesService } from '../guides/guides.service';
import { escapeLike, pickDefined } from '../utils/query';

import type {
  CreatePackageDto,
  PackageFiltersDto,
  PackageUploadUrlDto,
  SetAttractionsDto,
  UpdatePackageDto,
} from './dto';

@Injectable()
export class TourPackagesService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly s3: S3Service,
    private readonly guidesService: GuidesService,
  ) {}

  private async assertOwnership(packageId: string, userId: string): Promise<string> {
    const guideId = await this.guidesService.resolveGuideId(userId);

    const [pkg] = await this.db
      .select({ id: tourPackages.id, guideId: tourPackages.guideId })
      .from(tourPackages)
      .where(and(eq(tourPackages.id, packageId), isNull(tourPackages.deletedAt)))
      .limit(1);

    if (!pkg) throw new NotFoundException(`Package not found: ${packageId}`);
    if (pkg.guideId !== guideId) throw new ForbiddenException('You do not own this package');

    return guideId;
  }

  private async validateAttractionIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const rows = await this.db
      .select({ id: attractions.id })
      .from(attractions)
      .where(
        and(
          inArray(attractions.id, ids),
          eq(attractions.isActive, true),
          isNull(attractions.deletedAt),
        ),
      );

    if (rows.length !== ids.length) {
      throw new BadRequestException('One or more attraction IDs are invalid or inactive');
    }
  }

  private buildFilters(query: PackageFiltersDto, includeAll = false): SQL | undefined {
    const conditions: SQL[] = [];

    if (!includeAll) {
      conditions.push(eq(tourPackages.status, 'active'));
      conditions.push(isNull(tourPackages.deletedAt));
    }

    if (query.minPrice != null) conditions.push(gte(tourPackages.price, query.minPrice));
    if (query.maxPrice != null) conditions.push(lte(tourPackages.price, query.maxPrice));
    if (query.minDuration != null)
      conditions.push(gte(tourPackages.durationHours, query.minDuration));
    if (query.maxDuration != null)
      conditions.push(lte(tourPackages.durationHours, query.maxDuration));
    if (query.minPeople != null) conditions.push(gte(tourPackages.maxPeople, query.minPeople));
    if (query.guideId) conditions.push(eq(tourPackages.guideId, query.guideId));

    if (query.attractionId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM guide_booking.tour_package_attractions tpa
          WHERE tpa.package_id = ${tourPackages.id}
            AND tpa.attraction_id = ${query.attractionId}::uuid
        )`,
      );
    }

    if (query.area) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM guide_booking.guides g
          WHERE g.id = ${tourPackages.guideId}
            AND g.areas_of_operation @> ARRAY[${query.area}]::text[]
        )`,
      );
    }

    if (query.search) {
      const escaped = escapeLike(query.search);
      const searchCond = or(
        ilike(tourPackages.titleAr, `%${escaped}%`),
        ilike(tourPackages.titleEn, `%${escaped}%`),
        ilike(tourPackages.description, `%${escaped}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private async countPackages(where: SQL | undefined): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(tourPackages)
      .where(where);
    return row?.total ?? 0;
  }

  // ─── CRUD + Query methods (implemented in next section) ─────────────────────

  async create(dto: CreatePackageDto, userId: string) {
    const guideId = await this.guidesService.resolveGuideId(userId);
    if (dto.attractionIds) await this.validateAttractionIds(dto.attractionIds);

    return await this.db.transaction(async (tx) => {
      const [pkg] = await tx
        .insert(tourPackages)
        .values({
          guideId,
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          description: dto.description,
          durationHours: dto.durationHours,
          maxPeople: dto.maxPeople,
          price: dto.price,
          includes: dto.includes,
          images: dto.images,
        })
        .returning();

      if (!pkg) throw new Error('Insert did not return a row');

      if (dto.attractionIds?.length) {
        await tx.insert(tourPackageAttractions).values(
          dto.attractionIds.map((attractionId, i) => ({
            packageId: pkg.id,
            attractionId,
            sortOrder: i,
          })),
        );
      }

      return pkg;
    });
  }

  private buildRawFilters(query: PackageFiltersDto): SQL {
    const parts: SQL[] = [];

    if (query.minPrice != null) parts.push(sql`AND tp.price >= ${query.minPrice}`);
    if (query.maxPrice != null) parts.push(sql`AND tp.price <= ${query.maxPrice}`);
    if (query.minDuration != null) parts.push(sql`AND tp.duration_hours >= ${query.minDuration}`);
    if (query.maxDuration != null) parts.push(sql`AND tp.duration_hours <= ${query.maxDuration}`);
    if (query.minPeople != null) parts.push(sql`AND tp.max_people >= ${query.minPeople}`);
    if (query.guideId) parts.push(sql`AND tp.guide_id = ${query.guideId}::uuid`);

    if (query.attractionId) {
      parts.push(sql`AND EXISTS (
        SELECT 1 FROM guide_booking.tour_package_attractions tpa2
        WHERE tpa2.package_id = tp.id AND tpa2.attraction_id = ${query.attractionId}::uuid
      )`);
    }

    if (query.area) {
      parts.push(sql`AND EXISTS (
        SELECT 1 FROM guide_booking.guides g2
        WHERE g2.id = tp.guide_id AND g2.areas_of_operation @> ARRAY[${query.area}]::text[]
      )`);
    }

    if (query.search) {
      const escaped = escapeLike(query.search);
      parts.push(sql`AND (
        tp.title_ar ILIKE ${`%${escaped}%`}
        OR tp.title_en ILIKE ${`%${escaped}%`}
        OR tp.description ILIKE ${`%${escaped}%`}
      )`);
    }

    return parts.length > 0 ? sql.join(parts, sql` `) : sql``;
  }

  async findAll(query: PackageFiltersDto) {
    const offset = (query.page - 1) * query.limit;
    const filters = this.buildRawFilters(query);

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
          g.id AS "guideId",
          g.bio_ar AS "guideBioAr",
          g.bio_en AS "guideBioEn",
          g.profile_image AS "guideProfileImage",
          g.rating_avg AS "guideRatingAvg",
          g.rating_count AS "guideRatingCount",
          g.license_verified AS "guideLicenseVerified",
          COALESCE(
            ARRAY_AGG(a.slug ORDER BY tpa.sort_order)
              FILTER (WHERE a.id IS NOT NULL AND a.deleted_at IS NULL),
            '{}'
          ) AS "attractionSlugs"
        FROM guide_booking.tour_packages tp
        JOIN guide_booking.guides g ON g.id = tp.guide_id
        LEFT JOIN guide_booking.tour_package_attractions tpa ON tpa.package_id = tp.id
        LEFT JOIN guide_booking.attractions a ON a.id = tpa.attraction_id
        WHERE tp.status = 'active'
          AND tp.deleted_at IS NULL
          ${filters}
        GROUP BY tp.id, g.id
        ORDER BY tp.created_at DESC
        LIMIT ${query.limit}
        OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM guide_booking.tour_packages tp
        WHERE tp.status = 'active'
          AND tp.deleted_at IS NULL
          ${filters}
      `),
    ]);

    const total = (countRow as { total: number }).total;

    return {
      data: rows as unknown[],
      total,
      page: query.page,
      limit: query.limit,
      hasMore: offset + query.limit < total,
    };
  }

  async findById(id: string) {
    const rows = await this.db.execute(sql`
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
        g.id AS "guideId",
        g.bio_ar AS "guideBioAr",
        g.bio_en AS "guideBioEn",
        g.profile_image AS "guideProfileImage",
        g.rating_avg AS "guideRatingAvg",
        g.rating_count AS "guideRatingCount",
        g.license_verified AS "guideLicenseVerified",
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', a.id,
              'nameAr', a.name_ar,
              'nameEn', a.name_en,
              'slug', a.slug,
              'thumbnail', a.thumbnail,
              'type', a.type,
              'area', a.area,
              'sortOrder', tpa.sort_order
            ) ORDER BY tpa.sort_order
          ) FILTER (WHERE a.id IS NOT NULL AND a.deleted_at IS NULL),
          '[]'::json
        ) AS "linkedAttractions"
      FROM guide_booking.tour_packages tp
      JOIN guide_booking.guides g ON g.id = tp.guide_id
      LEFT JOIN guide_booking.tour_package_attractions tpa ON tpa.package_id = tp.id
      LEFT JOIN guide_booking.attractions a ON a.id = tpa.attraction_id
      WHERE tp.id = ${id}
        AND tp.status = 'active'
        AND tp.deleted_at IS NULL
      GROUP BY tp.id, g.id
    `);

    const [row] = rows;
    if (!row) throw new NotFoundException(`Package not found: ${id}`);
    return row;
  }

  async findMyPackages(
    userId: string,
    status: 'active' | 'inactive' | undefined,
    page: number,
    limit: number,
  ) {
    const guideId = await this.guidesService.resolveGuideId(userId);
    const offset = (page - 1) * limit;

    const statusCondition =
      status === 'active'
        ? sql`AND tp.status = 'active'`
        : status === 'inactive'
          ? sql`AND tp.status = 'inactive'`
          : sql``;

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
          AND tp.deleted_at IS NULL
          ${statusCondition}
        GROUP BY tp.id
        ORDER BY tp.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM guide_booking.tour_packages tp
        WHERE tp.guide_id = ${guideId}
          AND tp.deleted_at IS NULL
          ${statusCondition}
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

  async update(id: string, userId: string, dto: UpdatePackageDto) {
    await this.assertOwnership(id, userId);

    const [row] = await this.db
      .update(tourPackages)
      .set({ ...pickDefined(dto), updatedAt: new Date() })
      .where(and(eq(tourPackages.id, id), isNull(tourPackages.deletedAt)))
      .returning();

    if (!row) throw new NotFoundException(`Package not found: ${id}`);
    return row;
  }

  async softDelete(id: string, userId: string): Promise<{ message: string }> {
    await this.assertOwnership(id, userId);

    await this.db
      .update(tourPackages)
      .set({ deletedAt: new Date(), status: 'inactive', updatedAt: new Date() })
      .where(eq(tourPackages.id, id));

    return { message: 'Package deleted' };
  }

  async setAttractions(id: string, userId: string, dto: SetAttractionsDto): Promise<void> {
    await this.assertOwnership(id, userId);

    const attractionIds = dto.attractions.map((a) => a.attractionId);
    await this.validateAttractionIds(attractionIds);

    await this.db.transaction(async (tx) => {
      await tx.delete(tourPackageAttractions).where(eq(tourPackageAttractions.packageId, id));

      if (dto.attractions.length > 0) {
        await tx.insert(tourPackageAttractions).values(
          dto.attractions.map((a) => ({
            packageId: id,
            attractionId: a.attractionId,
            sortOrder: a.sortOrder ?? 0,
          })),
        );
      }

      await tx.update(tourPackages).set({ updatedAt: new Date() }).where(eq(tourPackages.id, id));
    });
  }

  async getUploadUrl(id: string, userId: string, dto: PackageUploadUrlDto) {
    await this.assertOwnership(id, userId);
    const key = `packages/${id}/${generateId()}-${dto.filename}`;
    return this.s3.getPresignedUploadUrl({ key, contentType: dto.contentType });
  }

  async adminFindAll(query: PackageFiltersDto, status?: 'active' | 'inactive' | 'deleted') {
    const baseWhere = this.buildFilters(query, true);

    let statusCondition: SQL | undefined;
    if (status === 'active') {
      statusCondition = and(eq(tourPackages.status, 'active'), isNull(tourPackages.deletedAt));
    } else if (status === 'inactive') {
      statusCondition = and(eq(tourPackages.status, 'inactive'), isNull(tourPackages.deletedAt));
    } else if (status === 'deleted') {
      statusCondition = sql`${tourPackages.deletedAt} IS NOT NULL`;
    }

    const where = and(baseWhere, statusCondition);
    const offset = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.db
        .select()
        .from(tourPackages)
        .where(where)
        .orderBy(sql`${tourPackages.createdAt} DESC`)
        .limit(query.limit)
        .offset(offset),
      this.countPackages(where),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: offset + query.limit < total,
    };
  }
}
