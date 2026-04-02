import { createHash } from 'node:crypto';

import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';

import type { SearchResponse, SearchResult } from './types';

const CACHE_TTL_SECONDS = 300;

function buildPrefixTsQuery(text: string): string | null {
  const tokens = text
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g,
      '',
    )
    .replace(/[&|!:()<>']/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return null;

  return tokens.map((token) => `${token}:*`).join(' & ');
}

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
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as SearchResponse;
    } catch (err) {
      this.logger.warn('Cache read failed, treating as miss', err);
    }

    // Fetch one extra row to determine if more results exist
    const fetchLimit = limit + offset + 1;

    const [guideResults, attractionResults, packageResults] = await Promise.all([
      this.searchGuides(q, fetchLimit),
      this.searchAttractions(q, fetchLimit),
      this.searchPackages(q, fetchLimit),
    ]);

    const allResults = this.mergeResults(guideResults, attractionResults, packageResults);

    let finalResults = allResults;
    if (allResults.length < fetchLimit) {
      const existingIds = new Set(allResults.map((r) => r.id));
      const remaining = fetchLimit - allResults.length;

      const [fuzzyGuides, fuzzyAttractions, fuzzyPackages] = await Promise.all([
        this.fuzzySearchGuides(q, remaining, existingIds),
        this.fuzzySearchAttractions(q, remaining, existingIds),
        this.fuzzySearchPackages(q, remaining, existingIds),
      ]);

      const fuzzyResults = this.mergeResults(fuzzyGuides, fuzzyAttractions, fuzzyPackages);
      finalResults = [...allResults, ...fuzzyResults.slice(0, remaining)];
    }

    const hasMore = finalResults.length > offset + limit;
    const paginated = finalResults.slice(offset, offset + limit);
    const response: SearchResponse = {
      data: paginated,
      hasMore,
      query: q,
    };

    this.redis.set(key, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS).catch((err: unknown) => {
      this.logger.warn('Search cache set failed', err);
    });

    return response;
  }

  private async searchGuides(q: string, limit: number): Promise<SearchResult[]> {
    const prefixQuery = buildPrefixTsQuery(q);
    if (!prefixQuery) return [];

    const rows = await this.db.execute<{
      id: string;
      bio_ar: string | null;
      bio_en: string | null;
      snippet: string;
      rank: string;
      languages: string[];
      specialties: string[];
      areas_of_operation: string[];
      base_price: number;
      rating_avg: number | null;
    }>(sql`
      SELECT g.id, g.bio_ar, g.bio_en,
        ts_headline('simple', guide_booking.normalize_arabic(coalesce(g.bio_ar, '')), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(g.search_vector, query) AS rank,
        g.languages, g.specialties, g.areas_of_operation, g.base_price, g.rating_avg
      FROM guide_booking.guides g,
        to_tsquery('simple', ${prefixQuery}) AS query
      WHERE g.search_vector @@ query
        AND g.active = true AND g.deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'guide' as const,
      title: { ar: r.bio_ar?.slice(0, 100) ?? '', en: r.bio_en?.slice(0, 100) ?? null },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: {
        languages: r.languages.join(', '),
        specialties: r.specialties.join(', '),
        areas: r.areas_of_operation.join(', '),
        basePrice: String(r.base_price),
        rating: r.rating_avg != null ? String(r.rating_avg) : undefined,
      },
    }));
  }

  private async searchAttractions(q: string, limit: number): Promise<SearchResult[]> {
    const prefixQuery = buildPrefixTsQuery(q);
    if (!prefixQuery) return [];

    const rows = await this.db.execute<{
      id: string;
      name_ar: string;
      name_en: string | null;
      snippet: string;
      rank: string;
      type: string;
      area: string;
      difficulty: string | null;
      rating_avg: number | null;
    }>(sql`
      SELECT a.id, a.name_ar, a.name_en,
        ts_headline('simple', guide_booking.normalize_arabic(coalesce(a.description_ar, '')), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(a.search_vector, query) AS rank,
        a.type, a.area, a.difficulty, a.rating_avg
      FROM guide_booking.attractions a,
        to_tsquery('simple', ${prefixQuery}) AS query
      WHERE a.search_vector @@ query
        AND a.is_active = true AND a.deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'attraction' as const,
      title: { ar: r.name_ar, en: r.name_en },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: {
        attractionType: r.type,
        area: r.area,
        difficulty: r.difficulty ?? undefined,
        rating: r.rating_avg != null ? String(r.rating_avg) : undefined,
      },
    }));
  }

  private async searchPackages(q: string, limit: number): Promise<SearchResult[]> {
    const prefixQuery = buildPrefixTsQuery(q);
    if (!prefixQuery) return [];

    const rows = await this.db.execute<{
      id: string;
      title_ar: string;
      title_en: string | null;
      snippet: string;
      rank: string;
      guide_id: string;
      duration_hours: number;
      price: number;
      max_people: number;
    }>(sql`
      SELECT p.id, p.title_ar, p.title_en,
        ts_headline('simple', guide_booking.normalize_arabic(coalesce(p.description, '')), query, 'MaxFragments=2, MaxWords=30') AS snippet,
        ts_rank_cd(p.search_vector, query) AS rank,
        p.guide_id, p.duration_hours, p.price, p.max_people
      FROM guide_booking.tour_packages p,
        to_tsquery('simple', ${prefixQuery}) AS query
      WHERE p.search_vector @@ query
        AND p.status = 'active' AND p.deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'package' as const,
      title: { ar: r.title_ar, en: r.title_en },
      snippet: r.snippet,
      rank: Number(r.rank),
      metadata: {
        guideId: r.guide_id,
        durationHours: String(r.duration_hours),
        price: String(r.price),
        maxPeople: String(r.max_people),
      },
    }));
  }

  private buildExcludeIdList(excludeIds: Set<string>) {
    if (excludeIds.size === 0) return null;
    return sql.join(
      [...excludeIds].map((id) => sql`${id}`),
      sql`, `,
    );
  }

  private async fuzzySearchGuides(
    q: string,
    limit: number,
    excludeIds: Set<string>,
  ): Promise<SearchResult[]> {
    const excludeList = this.buildExcludeIdList(excludeIds);

    const rows = await this.db.execute<{
      id: string;
      bio_ar: string | null;
      bio_en: string | null;
      rank: string;
      languages: string[];
      specialties: string[];
      areas_of_operation: string[];
      base_price: number;
      rating_avg: number | null;
    }>(sql`
      SELECT g.id, g.bio_ar, g.bio_en,
        greatest(
          public.similarity(guide_booking.normalize_arabic(coalesce(g.bio_ar, '')), guide_booking.normalize_arabic(${q})),
          public.similarity(coalesce(g.bio_en, ''), ${q})
        ) AS rank,
        g.languages, g.specialties, g.areas_of_operation, g.base_price, g.rating_avg
      FROM guide_booking.guides g
      WHERE (
        public.similarity(guide_booking.normalize_arabic(coalesce(g.bio_ar, '')), guide_booking.normalize_arabic(${q})) > 0.3
        OR public.similarity(coalesce(g.bio_en, ''), ${q}) > 0.3
      )
        AND g.active = true AND g.deleted_at IS NULL
        ${excludeList ? sql`AND g.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'guide' as const,
      title: { ar: r.bio_ar?.slice(0, 100) ?? '', en: r.bio_en?.slice(0, 100) ?? null },
      snippet: r.bio_ar?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: {
        languages: r.languages.join(', '),
        specialties: r.specialties.join(', '),
        areas: r.areas_of_operation.join(', '),
        basePrice: String(r.base_price),
        rating: r.rating_avg != null ? String(r.rating_avg) : undefined,
      },
    }));
  }

  private async fuzzySearchAttractions(
    q: string,
    limit: number,
    excludeIds: Set<string>,
  ): Promise<SearchResult[]> {
    const excludeList = this.buildExcludeIdList(excludeIds);

    const rows = await this.db.execute<{
      id: string;
      name_ar: string;
      name_en: string | null;
      description_ar: string | null;
      rank: string;
      type: string;
      area: string;
      difficulty: string | null;
      rating_avg: number | null;
    }>(sql`
      SELECT a.id, a.name_ar, a.name_en, a.description_ar,
        greatest(
          public.similarity(guide_booking.normalize_arabic(a.name_ar), guide_booking.normalize_arabic(${q})),
          public.similarity(coalesce(a.name_en, ''), ${q})
        ) AS rank,
        a.type, a.area, a.difficulty, a.rating_avg
      FROM guide_booking.attractions a
      WHERE (
        public.similarity(guide_booking.normalize_arabic(a.name_ar), guide_booking.normalize_arabic(${q})) > 0.3
        OR public.similarity(coalesce(a.name_en, ''), ${q}) > 0.3
      )
        AND a.is_active = true AND a.deleted_at IS NULL
        ${excludeList ? sql`AND a.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'attraction' as const,
      title: { ar: r.name_ar, en: r.name_en },
      snippet: r.description_ar?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: {
        attractionType: r.type,
        area: r.area,
        difficulty: r.difficulty ?? undefined,
        rating: r.rating_avg != null ? String(r.rating_avg) : undefined,
      },
    }));
  }

  private async fuzzySearchPackages(
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
      guide_id: string;
      duration_hours: number;
      price: number;
      max_people: number;
    }>(sql`
      SELECT p.id, p.title_ar, p.title_en, p.description,
        greatest(
          public.similarity(guide_booking.normalize_arabic(p.title_ar), guide_booking.normalize_arabic(${q})),
          public.similarity(coalesce(p.title_en, ''), ${q})
        ) AS rank,
        p.guide_id, p.duration_hours, p.price, p.max_people
      FROM guide_booking.tour_packages p
      WHERE (
        public.similarity(guide_booking.normalize_arabic(p.title_ar), guide_booking.normalize_arabic(${q})) > 0.3
        OR public.similarity(coalesce(p.title_en, ''), ${q}) > 0.3
      )
        AND p.status = 'active' AND p.deleted_at IS NULL
        ${excludeList ? sql`AND p.id NOT IN (${excludeList})` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      type: 'package' as const,
      title: { ar: r.title_ar, en: r.title_en },
      snippet: r.description?.slice(0, 150) ?? '',
      rank: Number(r.rank),
      metadata: {
        guideId: r.guide_id,
        durationHours: String(r.duration_hours),
        price: String(r.price),
        maxPeople: String(r.max_people),
      },
    }));
  }

  private mergeResults(...arrays: SearchResult[][]): SearchResult[] {
    return arrays.flat().sort((a, b) => b.rank - a.rank);
  }

  private cacheKey(q: string, limit: number, offset: number): string {
    const queryHash = createHash('sha256').update(q).digest('hex').slice(0, 16);
    return `gb:search:${queryHash}:${limit}:${offset}`;
  }
}
