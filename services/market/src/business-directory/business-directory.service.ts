import { DRIZZLE_CLIENT, REDIS_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, PaginatedResponse } from '@hena-wadeena/types';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SQL, and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getTableColumns } from 'drizzle-orm/utils';
import Redis from 'ioredis';

import { businessCommodities } from '../db/schema/business-commodities';
import { businessDirectories } from '../db/schema/business-directories';
import { commodities } from '../db/schema/commodities';
import { andRequired, paginate } from '../shared/query-helpers';
import { scanAndDelete } from '../shared/redis-helpers';

import { CreateBusinessDto } from './dto/create-business.dto';
import { QueryBusinessesDto } from './dto/query-businesses.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { searchVector, ...bizDirColumns } = getTableColumns(businessDirectories);

type BusinessDirectory = Omit<typeof businessDirectories.$inferSelect, 'searchVector'>;
type InsertBusinessDirectory = typeof businessDirectories.$inferInsert;

export interface LinkedCommodity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  unit: string;
}

/** Fields whose change triggers re-verification (identity-changing per spec §3.4). */
const RE_VERIFICATION_FIELDS = [
  'nameAr',
  'nameEn',
  'category',
  'description',
  'descriptionAr',
  'district',
] as const;

/** Batch-fetch linked commodities for a set of business IDs (avoids N+1). */
async function fetchLinkedCommodities(
  db: PostgresJsDatabase,
  businessIds: string[],
): Promise<Map<string, LinkedCommodity[]>> {
  const map = new Map<string, LinkedCommodity[]>();
  if (businessIds.length === 0) return map;

  const rows = await db
    .select({
      businessId: businessCommodities.businessId,
      id: commodities.id,
      nameAr: commodities.nameAr,
      nameEn: commodities.nameEn,
      category: commodities.category,
      unit: commodities.unit,
    })
    .from(businessCommodities)
    .innerJoin(commodities, eq(businessCommodities.commodityId, commodities.id))
    .where(
      andRequired(
        inArray(businessCommodities.businessId, businessIds),
        eq(commodities.isActive, true),
      ),
    );

  for (const row of rows) {
    const existing = map.get(row.businessId) ?? [];
    existing.push({
      id: row.id,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      category: row.category,
      unit: row.unit,
    });
    map.set(row.businessId, existing);
  }

  return map;
}

/** Attach linked commodities to a list of businesses. */
async function withCommodities(
  db: PostgresJsDatabase,
  businesses: BusinessDirectory[],
): Promise<(BusinessDirectory & { commodities: LinkedCommodity[] })[]> {
  const ids = businesses.map((b) => b.id);
  const commodityMap = await fetchLinkedCommodities(db, ids);
  return businesses.map((biz) => ({ ...biz, commodities: commodityMap.get(biz.id) ?? [] }));
}

@Injectable()
export class BusinessDirectoryService {
  private readonly logger = new Logger(BusinessDirectoryService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  // --- Ownership ---

  private async findByIdOrThrow(id: string): Promise<BusinessDirectory> {
    const [business] = await this.db
      .select(bizDirColumns)
      .from(businessDirectories)
      .where(andRequired(eq(businessDirectories.id, id), isNull(businessDirectories.deletedAt)))
      .limit(1);

    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async assertOwnership(id: string, userId: string): Promise<BusinessDirectory> {
    const business = await this.findByIdOrThrow(id);
    if (business.ownerId !== userId) throw new ForbiddenException('Not the business owner');
    return business;
  }

  // --- Validation helpers ---

  private async validateCommodityIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const existing = await this.db
      .select({ id: commodities.id })
      .from(commodities)
      .where(inArray(commodities.id, ids));
    if (existing.length !== ids.length) {
      const found = new Set(existing.map((r) => r.id));
      const missing = ids.filter((id) => !found.has(id));
      throw new BadRequestException(`Invalid commodity IDs: ${missing.join(', ')}`);
    }
  }

  // --- CRUD ---

  async create(dto: CreateBusinessDto, ownerId: string, role?: string): Promise<BusinessDirectory> {
    if (dto.commodityIds?.length) {
      await this.validateCommodityIds(dto.commodityIds);
    }

    const locationExpr = dto.location
      ? sql`public.ST_SetSRID(public.ST_MakePoint(${dto.location.lng}, ${dto.location.lat}), 4326)`
      : null;
    const createdByAdmin = role === 'admin';

    const business = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(businessDirectories)
        .values({
          ownerId,
          nameAr: dto.nameAr,
          nameEn: dto.nameEn,
          category: dto.category,
          description: dto.description,
          descriptionAr: dto.descriptionAr,
          district: dto.district,
          location: locationExpr as unknown as InsertBusinessDirectory['location'],
          phone: dto.phone,
          website: dto.website,
          logoUrl: dto.logoUrl,
          verificationStatus: createdByAdmin ? 'verified' : 'pending',
          verifiedBy: createdByAdmin ? ownerId : null,
          verifiedAt: createdByAdmin ? new Date() : null,
        })
        .returning();

      if (!created) throw new InternalServerErrorException('Failed to create business');

      if (dto.commodityIds && dto.commodityIds.length > 0) {
        await tx
          .insert(businessCommodities)
          .values(dto.commodityIds.map((commodityId) => ({ businessId: created.id, commodityId })));
      }

      return created;
    });

    this.invalidateBizDirCache();
    return business;
  }

  async update(
    id: string,
    dto: UpdateBusinessDto,
    userId: string,
    role?: string,
  ): Promise<BusinessDirectory> {
    if (dto.commodityIds?.length) {
      await this.validateCommodityIds(dto.commodityIds);
    }

    const business =
      role === 'admin' ? await this.findByIdOrThrow(id) : await this.assertOwnership(id, userId);

    // Determine if re-verification is needed (spec §3.4)
    const hasReVerificationField = RE_VERIFICATION_FIELDS.some((field) => dto[field] !== undefined);
    const commodityIdsChanged = dto.commodityIds !== undefined;
    const shouldResetVerification =
      (hasReVerificationField || commodityIdsChanged) && business.verificationStatus !== 'pending';

    const updates: Partial<InsertBusinessDirectory> = { updatedAt: new Date() };
    if (dto.nameAr !== undefined) updates.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) updates.nameEn = dto.nameEn;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.descriptionAr !== undefined) updates.descriptionAr = dto.descriptionAr;
    if (dto.district !== undefined) updates.district = dto.district;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.website !== undefined) updates.website = dto.website;
    if (dto.logoUrl !== undefined) updates.logoUrl = dto.logoUrl;
    if (dto.location !== undefined) {
      updates.location =
        sql`public.ST_SetSRID(public.ST_MakePoint(${dto.location.lng}, ${dto.location.lat}), 4326)` as unknown as InsertBusinessDirectory['location'];
    }

    if (shouldResetVerification) {
      updates.verificationStatus = 'pending';
      updates.verifiedBy = null;
      updates.verifiedAt = null;
      updates.rejectionReason = null;
    }

    const updated = await this.db.transaction(async (tx) => {
      const [updatedRow] = await tx
        .update(businessDirectories)
        .set(updates)
        .where(andRequired(eq(businessDirectories.id, id), isNull(businessDirectories.deletedAt)))
        .returning();

      if (!updatedRow) throw new NotFoundException('Business not found');

      if (dto.commodityIds !== undefined) {
        await tx.delete(businessCommodities).where(eq(businessCommodities.businessId, id));

        if (dto.commodityIds.length > 0) {
          await tx
            .insert(businessCommodities)
            .values(dto.commodityIds.map((commodityId) => ({ businessId: id, commodityId })));
        }
      }

      return updatedRow;
    });

    this.invalidateBizDirCache();
    return updated;
  }

  async remove(id: string, userId: string, role?: string): Promise<void> {
    if (role === 'admin') {
      await this.findByIdOrThrow(id);
    } else {
      await this.assertOwnership(id, userId);
    }

    const [removed] = await this.db
      .update(businessDirectories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(andRequired(eq(businessDirectories.id, id), isNull(businessDirectories.deletedAt)))
      .returning({ id: businessDirectories.id });

    if (!removed) throw new NotFoundException('Business not found');

    this.invalidateBizDirCache();
  }

  async findById(id: string): Promise<BusinessDirectory & { commodities: LinkedCommodity[] }> {
    const [business] = await this.db
      .select(bizDirColumns)
      .from(businessDirectories)
      .where(
        andRequired(
          eq(businessDirectories.id, id),
          eq(businessDirectories.verificationStatus, 'verified'),
          eq(businessDirectories.status, 'active'),
          isNull(businessDirectories.deletedAt),
        ),
      )
      .limit(1);

    if (!business) throw new NotFoundException('Business not found');

    const linked = await this.db
      .select({
        id: commodities.id,
        nameAr: commodities.nameAr,
        nameEn: commodities.nameEn,
        category: commodities.category,
        unit: commodities.unit,
      })
      .from(businessCommodities)
      .innerJoin(commodities, eq(businessCommodities.commodityId, commodities.id))
      .where(andRequired(eq(businessCommodities.businessId, id), eq(commodities.isActive, true)));

    return { ...business, commodities: linked as LinkedCommodity[] };
  }

  // --- Queries ---

  async findAll(
    query: QueryBusinessesDto,
  ): Promise<PaginatedResponse<BusinessDirectory & { commodities: LinkedCommodity[] }>> {
    const { category, district, commodity_id, q, offset, limit } = query;

    // Deterministic cache key from sorted query params
    const cacheKey =
      'mkt:biz-dir:list:' +
      Object.entries({ category, district, commodity_id, q, offset, limit })
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&');

    const cached = await this.redis.get(cacheKey);
    if (cached)
      return JSON.parse(cached) as PaginatedResponse<
        BusinessDirectory & { commodities: LinkedCommodity[] }
      >;

    // Build WHERE conditions (flat query — commodity_id uses EXISTS subquery)
    const conditions: (SQL | undefined)[] = [
      eq(businessDirectories.verificationStatus, 'verified'),
      eq(businessDirectories.status, 'active'),
      isNull(businessDirectories.deletedAt),
    ];

    if (category) conditions.push(eq(businessDirectories.category, category));
    if (district) conditions.push(eq(businessDirectories.district, district));
    if (commodity_id) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM market.business_commodities bc WHERE bc.business_id = ${businessDirectories.id} AND bc.commodity_id = ${commodity_id})`,
      );
    }
    if (q) {
      conditions.push(
        sql`${businessDirectories.searchVector} @@ websearch_to_tsquery('simple', market.normalize_arabic(${q}))`,
      );
    }

    const whereClause = and(...conditions);

    const rows = await this.db
      .select(bizDirColumns)
      .from(businessDirectories)
      .where(whereClause)
      .orderBy(businessDirectories.createdAt)
      .offset(offset)
      .limit(limit);

    const countResult = await this.db
      .select({ count: sql<string>`COUNT(*)` })
      .from(businessDirectories)
      .where(whereClause);
    const total = Number(countResult[0]?.count ?? '0');

    // Batch-fetch linked commodities (single query instead of N+1)
    const businesses = await withCommodities(this.db, rows);

    const result = paginate(businesses, total, offset, limit);

    // Cache for 10 minutes (600s)
    this.redis.set(cacheKey, JSON.stringify(result), 'EX', 600).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return result;
  }

  async findMine(userId: string): Promise<BusinessDirectory[]> {
    return this.db
      .select(bizDirColumns)
      .from(businessDirectories)
      .where(
        andRequired(eq(businessDirectories.ownerId, userId), isNull(businessDirectories.deletedAt)),
      )
      .orderBy(businessDirectories.createdAt);
  }

  async findPending(
    query: QueryBusinessesDto,
  ): Promise<PaginatedResponse<BusinessDirectory & { commodities: LinkedCommodity[] }>> {
    const { offset, limit } = query;

    const condition = andRequired(
      eq(businessDirectories.verificationStatus, 'pending'),
      isNull(businessDirectories.deletedAt),
    );

    const rows = await this.db
      .select(bizDirColumns)
      .from(businessDirectories)
      .where(condition)
      .orderBy(businessDirectories.createdAt)
      .offset(offset)
      .limit(limit);

    const countResult = await this.db
      .select({ count: sql<string>`COUNT(*)` })
      .from(businessDirectories)
      .where(condition);
    const total = Number(countResult[0]?.count ?? '0');

    // Batch-fetch linked commodities (single query instead of N+1)
    const businesses = await withCommodities(this.db, rows);

    return paginate(businesses, total, offset, limit);
  }

  // --- Verification ---

  async verify(id: string, dto: VerifyBusinessDto, adminId: string): Promise<BusinessDirectory> {
    const updates: Partial<InsertBusinessDirectory> = {
      verificationStatus: dto.status,
      updatedAt: new Date(),
    };

    if (dto.status === 'verified') {
      updates.verifiedBy = adminId;
      updates.verifiedAt = new Date();
      updates.rejectionReason = null;
    } else if (dto.status === 'rejected') {
      updates.rejectionReason = dto.rejectionReason ?? null;
      updates.verifiedBy = null;
      updates.verifiedAt = null;
    } else {
      // suspended
      updates.verifiedBy = null;
      updates.verifiedAt = null;
    }

    const [updated] = await this.db
      .update(businessDirectories)
      .set(updates)
      .where(andRequired(eq(businessDirectories.id, id), isNull(businessDirectories.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException('Business not found');

    if (dto.status === 'verified') {
      this.redisStreams
        .publish(EVENTS.BUSINESS_VERIFIED, {
          businessId: updated.id,
          nameAr: updated.nameAr,
          nameEn: updated.nameEn ?? '',
          category: updated.category,
          district: updated.district ?? '',
        })
        .catch((err: unknown) => {
          this.logger.error(`Failed to publish ${EVENTS.BUSINESS_VERIFIED}`, err);
        });
    }

    this.invalidateBizDirCache();
    return updated;
  }

  // --- Cache helpers ---

  invalidateBizDirCache(): void {
    scanAndDelete(this.redis, 'mkt:biz-dir:list:*').catch((err: unknown) => {
      this.logger.error('Cache invalidation failed', err);
    });
  }
}
