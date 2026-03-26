import { DRIZZLE_CLIENT, S3Service, generateId } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { slugify } from '@hena-wadeena/types';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, isNotNull, isNull, not, or, sql } from 'drizzle-orm';
import type { Column, SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { attractions } from '../db/schema/index';
import { escapeLike, pickDefined } from '../utils/query';

import type {
  AttractionFiltersDto,
  CreateAttractionDto,
  UpdateAttractionDto,
  UploadUrlDto,
} from './dto';
import { createAttractionSchema } from './dto';

type Attraction = typeof attractions.$inferSelect;

function makePoint(lng: number, lat: number) {
  return sql`public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)`;
}

function withinRadius(column: Column | SQL, point: SQL, meters: number) {
  return sql`public.ST_DWithin(${column}::public.geography, ${point}::public.geography, ${meters})`;
}

function distanceTo(column: Column | SQL, point: SQL) {
  return sql`public.ST_Distance(${column}::public.geography, ${point}::public.geography)`;
}

@Injectable()
export class AttractionsService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(S3Service) private readonly s3: S3Service,
  ) {}

  private buildWhereClause(
    filters: AttractionFiltersDto,
    includeInactive = false,
  ): SQL | undefined {
    const conditions: SQL[] = [];

    if (!includeInactive) {
      conditions.push(eq(attractions.isActive, true));
      conditions.push(isNull(attractions.deletedAt));
    }

    if (filters.type) {
      conditions.push(eq(attractions.type, filters.type));
    }

    if (filters.area) {
      conditions.push(eq(attractions.area, filters.area));
    }

    if (filters.featured === true) {
      conditions.push(eq(attractions.isFeatured, true));
    }

    if (filters.search) {
      const escaped = escapeLike(filters.search);
      const searchCond = or(
        ilike(attractions.nameAr, `%${escaped}%`),
        ilike(attractions.nameEn, `%${escaped}%`),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    if (filters.nearLat != null && filters.nearLng != null) {
      const point = makePoint(filters.nearLng, filters.nearLat);
      conditions.push(withinRadius(attractions.location, point, filters.radiusKm * 1000));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);

    const rows = await this.db
      .select({ slug: attractions.slug })
      .from(attractions)
      .where(or(eq(attractions.slug, base), ilike(attractions.slug, `${base}-%`)));

    const existingSlugs = new Set(rows.map(({ slug }) => slug));
    if (!existingSlugs.has(base)) return base;

    let i = 2;
    while (existingSlugs.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  private async paginate(
    where: SQL | undefined,
    orderBy: SQL,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<Attraction>> {
    const offset = (page - 1) * limit;

    const [data, countRows] = await Promise.all([
      this.db.select().from(attractions).where(where).orderBy(orderBy).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(attractions).where(where),
    ]);

    const total = countRows[0]?.count ?? 0;

    return { data, total, page, limit, hasMore: offset + limit < total };
  }

  async findAll(filters: AttractionFiltersDto): Promise<PaginatedResponse<Attraction>> {
    const where = this.buildWhereClause(filters);

    const orderBy =
      filters.nearLat != null && filters.nearLng != null
        ? distanceTo(attractions.location, makePoint(filters.nearLng, filters.nearLat))
        : desc(attractions.createdAt);

    return this.paginate(where, orderBy, filters.page, filters.limit);
  }

  async findBySlug(slug: string): Promise<Attraction> {
    const [row] = await this.db
      .select()
      .from(attractions)
      .where(
        and(
          eq(attractions.slug, slug),
          eq(attractions.isActive, true),
          isNull(attractions.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException(`Attraction not found: ${slug}`);
    return row;
  }

  async findNearby(slug: string, limit = 5, radiusKm = 50): Promise<Attraction[]> {
    const target = await this.findBySlug(slug);
    if (!target.location) return [];

    const point = makePoint(target.location.x, target.location.y);

    return this.db
      .select()
      .from(attractions)
      .where(
        and(
          eq(attractions.isActive, true),
          isNull(attractions.deletedAt),
          withinRadius(attractions.location, point, radiusKm * 1000),
          not(eq(attractions.id, target.id)),
        ),
      )
      .orderBy(distanceTo(attractions.location, point))
      .limit(limit);
  }

  async adminFindAll(
    filters: AttractionFiltersDto,
    status?: 'active' | 'inactive' | 'deleted',
  ): Promise<PaginatedResponse<Attraction>> {
    const baseWhere = this.buildWhereClause(filters, true);

    let statusCondition: SQL | undefined;
    if (status === 'active') {
      statusCondition = and(eq(attractions.isActive, true), isNull(attractions.deletedAt));
    } else if (status === 'inactive') {
      statusCondition = and(eq(attractions.isActive, false), isNull(attractions.deletedAt));
    } else if (status === 'deleted') {
      statusCondition = isNotNull(attractions.deletedAt);
    }

    return this.paginate(
      and(baseWhere, statusCondition),
      desc(attractions.createdAt),
      filters.page,
      filters.limit,
    );
  }

  async create(dto: CreateAttractionDto): Promise<Attraction> {
    const slug = await this.generateUniqueSlug(dto.nameEn ?? dto.nameAr);

    const [row] = await this.db
      .insert(attractions)
      .values({ ...createAttractionSchema.parse(dto), id: generateId(), slug })
      .returning();

    if (!row) throw new InternalServerErrorException('Insert did not return a row');
    return row;
  }

  async update(id: string, dto: UpdateAttractionDto): Promise<Attraction> {
    const [row] = await this.db
      .update(attractions)
      .set({ ...pickDefined(dto), updatedAt: new Date() })
      .where(and(eq(attractions.id, id), isNull(attractions.deletedAt)))
      .returning();

    if (!row) throw new NotFoundException(`Attraction not found: ${id}`);
    return row;
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const now = new Date();
    const [deleted] = await this.db
      .update(attractions)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(attractions.id, id), isNull(attractions.deletedAt)))
      .returning({ id: attractions.id });

    if (!deleted) throw new NotFoundException(`Attraction not found: ${id}`);
    return { message: 'Attraction deleted' };
  }

  async getUploadUrl(id: string, dto: UploadUrlDto) {
    const [existing] = await this.db
      .select({ id: attractions.id })
      .from(attractions)
      .where(and(eq(attractions.id, id), isNull(attractions.deletedAt)))
      .limit(1);

    if (!existing) throw new NotFoundException(`Attraction not found: ${id}`);

    const key = `attractions/${id}/${generateId()}-${dto.filename}`;

    return this.s3.getPresignedUploadUrl({ key, contentType: dto.contentType });
  }
}
