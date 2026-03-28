import { DRIZZLE_CLIENT, normalizeArabic, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import type { SearchResult, ServiceSearchResponse } from '@hena-wadeena/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';

const CACHE_TTL_SECONDS = 300;
const PUBLIC_ROLES = ['guide', 'merchant', 'driver'];

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async search(params: {
    q: string;
    limit: number;
    offset: number;
  }): Promise<ServiceSearchResponse> {
    const { q, limit, offset } = params;

    const normalizedQ = normalizeArabic(q);
    const key = `search:${normalizedQ}:${limit}:${offset}`;
    try {
      const cached = await this.redis.get(key);
      if (cached) return { ...(JSON.parse(cached) as ServiceSearchResponse), query: q };
    } catch (err: unknown) {
      this.logger.warn('Search cache read failed', err);
    }

    const fetchLimit = limit + offset + 1;
    const roleList = sql.join(
      PUBLIC_ROLES.map((r) => sql`${r}`),
      sql`, `,
    );

    let results = await this.fullTextSearch(q, fetchLimit, roleList);

    if (results.length < fetchLimit) {
      const existingIds = new Set(results.map((r) => r.id));
      const remaining = fetchLimit - results.length;
      const fuzzyResults = await this.fuzzySearch(q, remaining, existingIds, roleList);
      results = [...results, ...fuzzyResults];
    }

    const paginated = results.slice(offset, offset + limit);
    const response: ServiceSearchResponse = {
      data: paginated,
      hasMore: results.length > offset + limit,
      query: q,
    };

    this.redis.set(key, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS).catch((err: unknown) => {
      this.logger.warn('Search cache set failed', err);
    });

    return response;
  }

  private async fullTextSearch(
    q: string,
    limit: number,
    roleList: ReturnType<typeof sql.join>,
  ): Promise<SearchResult[]> {
    const rows = await this.db.execute<{
      id: string;
      full_name: string;
      snippet: string;
      rank: string;
      role: string;
    }>(sql`
      SELECT u.id, u.full_name,
        ts_headline('simple', identity.normalize_arabic(u.full_name), query, 'MaxFragments=1, MinWords=1, MaxWords=10') AS snippet,
        ts_rank_cd(u.search_vector, query) AS rank,
        u.role
      FROM identity.users u,
        websearch_to_tsquery('simple', identity.normalize_arabic(${q})) AS query
      WHERE u.search_vector @@ query
        AND u.role IN (${roleList})
        AND u.status = 'active'
        AND u.deleted_at IS NULL
      ORDER BY rank DESC, u.id ASC
      LIMIT ${limit}
    `);

    return rows.map((r) => this.toSearchResult(r, r.snippet));
  }

  private async fuzzySearch(
    q: string,
    limit: number,
    excludeIds: Set<string>,
    roleList: ReturnType<typeof sql.join>,
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
      full_name: string;
      rank: string;
      role: string;
    }>(sql`
      SELECT u.id, u.full_name,
        public.similarity(identity.normalize_arabic(u.full_name), identity.normalize_arabic(${q})) AS rank,
        u.role
      FROM identity.users u
      WHERE public.similarity(identity.normalize_arabic(u.full_name), identity.normalize_arabic(${q})) > 0.3
        AND u.role IN (${roleList})
        AND u.status = 'active'
        AND u.deleted_at IS NULL
        ${excludeList ? sql`AND u.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC, u.id ASC
      LIMIT ${limit}
    `);

    return rows.map((r) => this.toSearchResult(r, r.full_name));
  }

  private toSearchResult(
    row: { id: string; full_name: string; rank: string; role: string },
    snippet: string,
  ): SearchResult {
    return {
      id: row.id,
      type: 'user',
      title: { ar: row.full_name, en: null },
      snippet,
      rank: Number(row.rank),
      metadata: { role: row.role },
    };
  }
}
