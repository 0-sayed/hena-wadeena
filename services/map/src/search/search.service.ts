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

    let results = await this.searchPois(q, fetchLimit);

    if (results.length < fetchLimit) {
      const existingIds = new Set(results.map((r) => r.id));
      const remaining = fetchLimit - results.length;
      const fuzzyResults = await this.fuzzySearchPois(q, remaining, existingIds);
      results = [...results, ...fuzzyResults.slice(0, remaining)];
    }

    const paginated = results.slice(offset, offset + limit);
    const response: SearchResponse = {
      data: paginated,
      hasMore: results.length > offset + limit,
      query: q,
    };

    this.redis.set(key, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS).catch((err: unknown) => {
      this.logger.warn('Search cache set failed', err);
    });

    return response;
  }

  private async searchPois(q: string, limit: number): Promise<SearchResult[]> {
    const rows = await this.db.execute<{
      id: string;
      name_ar: string;
      name_en: string | null;
      snippet: string;
      rank: string;
      category: string;
      status: string;
      rating_avg: number | null;
    }>(sql`
      SELECT p.id, p.name_ar, p.name_en,
        ts_headline('simple', map.normalize_arabic(coalesce(p.description, '')), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(p.search_vector, query) AS rank,
        p.category, p.status, p.rating_avg
      FROM map.points_of_interest p,
        websearch_to_tsquery('simple', map.normalize_arabic(${q})) AS query
      WHERE p.search_vector @@ query
        AND p.status = 'approved' AND p.deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'poi' as const,
      title: { ar: r.name_ar, en: r.name_en },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: {
        category: r.category,
        status: r.status,
        rating: r.rating_avg != null ? String(r.rating_avg) : undefined,
      },
    }));
  }

  private async fuzzySearchPois(
    q: string,
    limit: number,
    excludeIds: Set<string>,
  ): Promise<SearchResult[]> {
    const excludeList =
      excludeIds.size > 0
        ? sql.join(
            [...excludeIds].map((id) => sql`${id}`),
            sql`, `,
          )
        : null;

    const rows = await this.db.execute<{
      id: string;
      name_ar: string;
      name_en: string | null;
      description: string | null;
      rank: string;
      category: string;
      status: string;
      rating_avg: number | null;
    }>(sql`
      SELECT p.id, p.name_ar, p.name_en, p.description,
        greatest(
          similarity(map.normalize_arabic(p.name_ar), map.normalize_arabic(${q})),
          similarity(coalesce(p.name_en, ''), ${q})
        ) AS rank,
        p.category, p.status, p.rating_avg
      FROM map.points_of_interest p
      WHERE (
        similarity(map.normalize_arabic(p.name_ar), map.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(p.name_en, ''), ${q}) > 0.3
      )
        AND p.status = 'approved' AND p.deleted_at IS NULL
        ${excludeList ? sql`AND p.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'poi' as const,
      title: { ar: r.name_ar, en: r.name_en },
      snippet: r.description?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: {
        category: r.category,
        status: r.status,
        rating: r.rating_avg != null ? String(r.rating_avg) : undefined,
      },
    }));
  }

  private cacheKey(q: string, limit: number, offset: number): string {
    return `map:search:${q}:${limit}:${offset}`;
  }
}
