import { DRIZZLE_CLIENT, REDIS_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SQL, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getTableColumns } from 'drizzle-orm/utils';
import Redis from 'ioredis';

import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';
import { scanAndDelete } from '../shared/redis-helpers';

import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';

// Exclude searchVector (tsvector generated column) from query results
const allOpportunityColumns = getTableColumns(investmentOpportunities);
const opportunityColumns = Object.fromEntries(
  Object.entries(allOpportunityColumns).filter(([key]) => key !== 'searchVector'),
) as Omit<typeof allOpportunityColumns, 'searchVector'>;

type Opportunity = Omit<typeof investmentOpportunities.$inferSelect, 'searchVector'>;
type PublicOpportunity = Omit<Opportunity, 'contact' | 'documents' | 'description'>;
type InsertOpportunity = typeof investmentOpportunities.$inferInsert;

function stripSensitiveFields(
  opp: Opportunity,
): Omit<Opportunity, 'contact' | 'documents' | 'description'> {
  const copy = { ...opp };
  delete (copy as Record<string, unknown>).contact;
  delete (copy as Record<string, unknown>).documents;
  delete (copy as Record<string, unknown>).description;
  delete (copy as Record<string, unknown>).searchVector;
  return copy as Omit<Opportunity, 'contact' | 'documents' | 'description'>;
}

const CACHE_TTL = 600; // 10 minutes
const CACHE_PREFIX = 'mkt:inv';

@Injectable()
export class InvestmentOpportunitiesService {
  private readonly logger = new Logger(InvestmentOpportunitiesService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly redisStreams: RedisStreamsService,
  ) {}

  // --- Private helpers ---

  private buildFilters(query: QueryOpportunitiesDto): SQL {
    const conditions: SQL[] = [eq(investmentOpportunities.status, 'active')];

    if (query.sector !== undefined) {
      conditions.push(
        eq(investmentOpportunities.sector, query.sector as InsertOpportunity['sector']),
      );
    }
    if (query.area !== undefined) {
      conditions.push(eq(investmentOpportunities.area, query.area));
    }
    if (query.min_investment !== undefined) {
      conditions.push(gte(investmentOpportunities.minInvestment, query.min_investment));
    }
    if (query.max_investment !== undefined) {
      conditions.push(lte(investmentOpportunities.maxInvestment, query.max_investment));
    }

    return andRequired(...conditions);
  }

  private async countOpportunities(filters: SQL): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(investmentOpportunities)
      .where(filters);
    return result[0]?.count ?? 0;
  }

  async findRaw(id: string): Promise<Opportunity | null> {
    const [opp] = await this.db
      .select(opportunityColumns)
      .from(investmentOpportunities)
      .where(eq(investmentOpportunities.id, id))
      .limit(1);
    return opp ?? null;
  }

  private buildCacheKey(prefix: string, params: object): string {
    return (
      `${CACHE_PREFIX}:${prefix}:` +
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&')
    );
  }

  private invalidateCache(): void {
    scanAndDelete(this.redis, `${CACHE_PREFIX}:*`).catch((err: unknown) => {
      this.logger.error('Cache invalidation failed', err);
    });
  }

  // --- Public methods ---

  async assertOwnership(opportunityId: string, callerId: string): Promise<Opportunity> {
    const opp = await this.findRaw(opportunityId);
    if (!opp) throw new NotFoundException('Opportunity not found');
    if (opp.ownerId !== callerId) throw new ForbiddenException('Not the opportunity owner');
    return opp;
  }

  async create(dto: CreateOpportunityDto, ownerId: string): Promise<Opportunity> {
    const { sector, ...rest } = dto;

    const opportunity = firstOrThrow(
      await this.db
        .insert(investmentOpportunities)
        .values({
          ...rest,
          sector: sector as InsertOpportunity['sector'],
          ownerId,
          status: 'draft',
        })
        .returning(),
    );

    this.invalidateCache();
    return opportunity;
  }

  async findById(
    id: string,
    callerId?: string,
    callerRole?: string,
  ): Promise<Opportunity | Omit<Opportunity, 'contact' | 'documents' | 'description'> | null> {
    const cacheKey = `${CACHE_PREFIX}:detail:${id}`;
    const cached = await this.redis.get(cacheKey);
    let opp: Opportunity | null = null;

    if (cached) {
      opp = JSON.parse(cached) as Opportunity;
    } else {
      opp = await this.findRaw(id);
      if (opp) {
        this.redis.set(cacheKey, JSON.stringify(opp), 'EX', CACHE_TTL).catch((err: unknown) => {
          this.logger.error('Cache set failed', err);
        });
      }
    }

    if (!opp) return null;

    // Owner and admin see all statuses; public sees only active
    if (opp.status !== 'active' && opp.ownerId !== callerId && callerRole !== 'admin') {
      return null;
    }

    // Sensitive fields (contact, documents, description) only for privileged callers
    const privilegedRoles = ['investor', 'merchant', 'admin'];
    const isPrivileged =
      opp.ownerId === callerId || (callerRole && privilegedRoles.includes(callerRole));
    if (!isPrivileged) {
      return stripSensitiveFields(opp);
    }

    return opp;
  }

  async findAll(query: QueryOpportunitiesDto): Promise<PaginatedResponse<PublicOpportunity>> {
    const cacheKey = this.buildCacheKey('list', query);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as PaginatedResponse<PublicOpportunity>;

    const filters = this.buildFilters(query);

    const [results, total] = await Promise.all([
      this.db
        .select(opportunityColumns)
        .from(investmentOpportunities)
        .where(filters)
        .orderBy(desc(investmentOpportunities.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.countOpportunities(filters),
    ]);

    const result = paginate(results.map(stripSensitiveFields), total, query.offset, query.limit);

    this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return result;
  }

  async findMine(ownerId: string): Promise<Opportunity[]> {
    return this.db
      .select(opportunityColumns)
      .from(investmentOpportunities)
      .where(eq(investmentOpportunities.ownerId, ownerId))
      .orderBy(desc(investmentOpportunities.updatedAt));
  }

  async findFeatured(query: QueryOpportunitiesDto): Promise<PaginatedResponse<PublicOpportunity>> {
    const cacheKey = this.buildCacheKey('featured', { offset: query.offset, limit: query.limit });
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as PaginatedResponse<PublicOpportunity>;

    const filters = andRequired(
      eq(investmentOpportunities.status, 'active'),
      eq(investmentOpportunities.isFeatured, true),
    );

    const [results, total] = await Promise.all([
      this.db
        .select(opportunityColumns)
        .from(investmentOpportunities)
        .where(filters)
        .orderBy(desc(investmentOpportunities.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.countOpportunities(filters),
    ]);

    const result = paginate(results.map(stripSensitiveFields), total, query.offset, query.limit);

    this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return result;
  }

  async findSectorStats(): Promise<{ sector: string; count: number }[]> {
    const cacheKey = `${CACHE_PREFIX}:sectors`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as { sector: string; count: number }[];

    const results = await this.db
      .select({
        sector: investmentOpportunities.sector,
        count: sql<number>`count(*)::int`,
      })
      .from(investmentOpportunities)
      .where(eq(investmentOpportunities.status, 'active'))
      .groupBy(investmentOpportunities.sector);

    this.redis.set(cacheKey, JSON.stringify(results), 'EX', CACHE_TTL).catch((err: unknown) => {
      this.logger.error('Cache set failed', err);
    });

    return results;
  }

  async update(id: string, dto: UpdateOpportunityDto): Promise<Opportunity> {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Opportunity not found');
    if (existing.status === 'closed') {
      throw new ConflictException('Cannot update a closed opportunity');
    }

    // Cross-validate partial min/max investment against existing DB values
    const effectiveMin = dto.minInvestment ?? existing.minInvestment;
    const effectiveMax = dto.maxInvestment ?? existing.maxInvestment;
    if (effectiveMax < effectiveMin) {
      throw new BadRequestException('maxInvestment must be >= minInvestment');
    }

    const { sector, ...rest } = dto;

    const [updated] = await this.db
      .update(investmentOpportunities)
      .set({
        ...rest,
        ...(sector !== undefined && { sector: sector as InsertOpportunity['sector'] }),
        updatedAt: new Date(),
      })
      .where(eq(investmentOpportunities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Opportunity not found');

    this.invalidateCache();
    return updated;
  }

  async close(id: string): Promise<Opportunity> {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Opportunity not found');
    if (existing.status === 'closed') {
      throw new ConflictException('Opportunity is already closed');
    }

    const [updated] = await this.db
      .update(investmentOpportunities)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(investmentOpportunities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Opportunity not found');

    this.invalidateCache();
    return updated;
  }

  async approve(id: string, adminId: string): Promise<Opportunity> {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Opportunity not found');
    if (existing.status !== 'review') {
      throw new ConflictException('Only opportunities in review status can be approved');
    }

    const [updated] = await this.db
      .update(investmentOpportunities)
      .set({
        status: 'active',
        isVerified: true,
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(investmentOpportunities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Opportunity not found');

    this.redisStreams
      .publish(EVENTS.OPPORTUNITY_PUBLISHED, {
        opportunityId: updated.id,
        ownerId: updated.ownerId,
        titleAr: updated.titleAr,
        titleEn: updated.titleEn ?? '',
        sector: updated.sector,
        area: updated.area ?? '',
        description: updated.description ?? '',
        createdAt: updated.createdAt.toISOString(),
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to publish ${EVENTS.OPPORTUNITY_PUBLISHED}`, err);
      });

    this.invalidateCache();
    return updated;
  }

  async toggleFeatured(id: string): Promise<Opportunity> {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Opportunity not found');

    const [updated] = await this.db
      .update(investmentOpportunities)
      .set({ isFeatured: !existing.isFeatured, updatedAt: new Date() })
      .where(eq(investmentOpportunities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Opportunity not found');

    this.invalidateCache();
    return updated;
  }
}
