import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';

import type { SearchResponse, SearchResult } from './types';

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async search(params: { q: string; limit: number; offset: number }): Promise<SearchResponse> {
    const { q, limit, offset } = params;

    const key = this.cacheKey(q, limit, offset);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as SearchResponse;

    const fetchLimit = limit + offset;

    const [listingResults, opportunityResults, businessResults] = await Promise.all([
      this.searchListings(q, fetchLimit),
      this.searchOpportunities(q, fetchLimit),
      this.searchBusinesses(q, fetchLimit),
    ]);

    const allResults = this.mergeResults(listingResults, opportunityResults, businessResults);

    let finalResults = allResults;
    if (allResults.length < fetchLimit) {
      const existingIds = new Set(allResults.map((r) => r.id));
      const remaining = fetchLimit - allResults.length;

      const [fuzzyListings, fuzzyOpportunities, fuzzyBusinesses] = await Promise.all([
        this.fuzzySearchListings(q, remaining, existingIds),
        this.fuzzySearchOpportunities(q, remaining, existingIds),
        this.fuzzySearchBusinesses(q, remaining, existingIds),
      ]);

      const fuzzyResults = this.mergeResults(fuzzyListings, fuzzyOpportunities, fuzzyBusinesses);
      finalResults = [...allResults, ...fuzzyResults.slice(0, remaining)];
    }

    const paginated = finalResults.slice(offset, offset + limit);
    const response: SearchResponse = {
      data: paginated,
      hasMore: finalResults.length > offset + limit,
      query: q,
    };

    this.redis.set(key, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS).catch((err: unknown) => {
      this.logger.warn('Search cache set failed', err);
    });

    return response;
  }

  private async searchListings(q: string, limit: number): Promise<SearchResult[]> {
    const rows = await this.db.execute<{
      id: string;
      title_ar: string;
      title_en: string | null;
      snippet: string;
      rank: string;
      category: string;
      district: string | null;
      status: string;
    }>(sql`
      SELECT l.id, l.title_ar, l.title_en,
        ts_headline('simple', market.normalize_arabic(coalesce(l.description, '')), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(l.search_vector, query) AS rank,
        l.category, l.district, l.status
      FROM market.listings l,
        websearch_to_tsquery('simple', market.normalize_arabic(${q})) AS query
      WHERE l.search_vector @@ query
        AND l.status = 'active' AND l.is_published = true AND l.deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'listing' as const,
      title: { ar: r.title_ar, en: r.title_en },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: { category: r.category, district: r.district ?? undefined, status: r.status },
    }));
  }

  private async searchOpportunities(q: string, limit: number): Promise<SearchResult[]> {
    const rows = await this.db.execute<{
      id: string;
      title_ar: string;
      title_en: string | null;
      snippet: string;
      rank: string;
      sector: string;
      area: string | null;
      status: string;
    }>(sql`
      SELECT o.id, o.title_ar, o.title_en,
        ts_headline('simple', market.normalize_arabic(coalesce(o.description, '')), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(o.search_vector, query) AS rank,
        o.sector, o.area, o.status
      FROM market.investment_opportunities o,
        websearch_to_tsquery('simple', market.normalize_arabic(${q})) AS query
      WHERE o.search_vector @@ query
        AND o.status = 'active'
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'opportunity' as const,
      title: { ar: r.title_ar, en: r.title_en },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: { sector: r.sector, district: r.area ?? undefined, status: r.status },
    }));
  }

  private async searchBusinesses(q: string, limit: number): Promise<SearchResult[]> {
    const rows = await this.db.execute<{
      id: string;
      name_ar: string;
      name_en: string | null;
      snippet: string;
      rank: string;
      category: string;
      district: string | null;
      status: string;
    }>(sql`
      SELECT b.id, b.name_ar, b.name_en,
        ts_headline('simple', market.normalize_arabic(coalesce(b.description, coalesce(b.description_ar, ''))), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(b.search_vector, query) AS rank,
        b.category, b.district, b.status
      FROM market.business_directories b,
        websearch_to_tsquery('simple', market.normalize_arabic(${q})) AS query
      WHERE b.search_vector @@ query
        AND b.status = 'active' AND b.verification_status = 'verified' AND b.deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'business' as const,
      title: { ar: r.name_ar, en: r.name_en },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: { category: r.category, district: r.district ?? undefined, status: r.status },
    }));
  }

  private buildExcludeIdList(excludeIds: Set<string>) {
    if (excludeIds.size === 0) return null;
    return sql.join(
      [...excludeIds].map((id) => sql`${id}`),
      sql`, `,
    );
  }

  private async fuzzySearchListings(
    q: string,
    limit: number,
    excludeIds: Set<string>,
  ): Promise<SearchResult[]> {
    const excludeList = this.buildExcludeIdList(excludeIds);

    const rows = await this.db.execute<{
      id: string;
      title_ar: string;
      title_en: string | null;
      description: string | null;
      rank: string;
      category: string;
      district: string | null;
      status: string;
    }>(sql`
      SELECT l.id, l.title_ar, l.title_en, l.description,
        greatest(
          similarity(market.normalize_arabic(l.title_ar), market.normalize_arabic(${q})),
          similarity(coalesce(l.title_en, ''), ${q})
        ) AS rank,
        l.category, l.district, l.status
      FROM market.listings l
      WHERE (
        similarity(market.normalize_arabic(l.title_ar), market.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(l.title_en, ''), ${q}) > 0.3
      )
        AND l.status = 'active' AND l.is_published = true AND l.deleted_at IS NULL
        ${excludeList ? sql`AND l.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'listing' as const,
      title: { ar: r.title_ar, en: r.title_en },
      snippet: r.description?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: { category: r.category, district: r.district ?? undefined, status: r.status },
    }));
  }

  private async fuzzySearchOpportunities(
    q: string,
    limit: number,
    excludeIds: Set<string>,
  ): Promise<SearchResult[]> {
    const excludeList = this.buildExcludeIdList(excludeIds);

    const rows = await this.db.execute<{
      id: string;
      title_ar: string;
      title_en: string | null;
      description: string | null;
      rank: string;
      sector: string;
      area: string | null;
      status: string;
    }>(sql`
      SELECT o.id, o.title_ar, o.title_en, o.description,
        greatest(
          similarity(market.normalize_arabic(o.title_ar), market.normalize_arabic(${q})),
          similarity(coalesce(o.title_en, ''), ${q})
        ) AS rank,
        o.sector, o.area, o.status
      FROM market.investment_opportunities o
      WHERE (
        similarity(market.normalize_arabic(o.title_ar), market.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(o.title_en, ''), ${q}) > 0.3
      )
        AND o.status = 'active'
        ${excludeList ? sql`AND o.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'opportunity' as const,
      title: { ar: r.title_ar, en: r.title_en },
      snippet: r.description?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: { sector: r.sector, district: r.area ?? undefined, status: r.status },
    }));
  }

  private async fuzzySearchBusinesses(
    q: string,
    limit: number,
    excludeIds: Set<string>,
  ): Promise<SearchResult[]> {
    const excludeList = this.buildExcludeIdList(excludeIds);

    const rows = await this.db.execute<{
      id: string;
      name_ar: string;
      name_en: string | null;
      description: string | null;
      rank: string;
      category: string;
      district: string | null;
      status: string;
    }>(sql`
      SELECT b.id, b.name_ar, b.name_en, b.description,
        greatest(
          similarity(market.normalize_arabic(b.name_ar), market.normalize_arabic(${q})),
          similarity(coalesce(b.name_en, ''), ${q})
        ) AS rank,
        b.category, b.district, b.status
      FROM market.business_directories b
      WHERE (
        similarity(market.normalize_arabic(b.name_ar), market.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(b.name_en, ''), ${q}) > 0.3
      )
        AND b.status = 'active' AND b.verification_status = 'verified' AND b.deleted_at IS NULL
        ${excludeList ? sql`AND b.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'business' as const,
      title: { ar: r.name_ar, en: r.name_en },
      snippet: r.description?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: { category: r.category, district: r.district ?? undefined, status: r.status },
    }));
  }

  private mergeResults(...arrays: SearchResult[][]): SearchResult[] {
    return arrays.flat().sort((a, b) => b.rank - a.rank);
  }

  private cacheKey(q: string, limit: number, offset: number): string {
    return `mkt:search:${q}:${limit}:${offset}`;
  }
}
