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

  private async searchGuides(q: string, limit: number): Promise<SearchResult[]> {
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
        websearch_to_tsquery('simple', guide_booking.normalize_arabic(${q})) AS query
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
        websearch_to_tsquery('simple', guide_booking.normalize_arabic(${q})) AS query
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
        websearch_to_tsquery('simple', guide_booking.normalize_arabic(${q})) AS query
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
          similarity(guide_booking.normalize_arabic(coalesce(g.bio_ar, '')), guide_booking.normalize_arabic(${q})),
          similarity(coalesce(g.bio_en, ''), ${q})
        ) AS rank,
        g.languages, g.specialties, g.areas_of_operation, g.base_price, g.rating_avg
      FROM guide_booking.guides g
      WHERE (
        similarity(guide_booking.normalize_arabic(coalesce(g.bio_ar, '')), guide_booking.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(g.bio_en, ''), ${q}) > 0.3
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
          similarity(guide_booking.normalize_arabic(a.name_ar), guide_booking.normalize_arabic(${q})),
          similarity(coalesce(a.name_en, ''), ${q})
        ) AS rank,
        a.type, a.area, a.difficulty, a.rating_avg
      FROM guide_booking.attractions a
      WHERE (
        similarity(guide_booking.normalize_arabic(a.name_ar), guide_booking.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(a.name_en, ''), ${q}) > 0.3
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
          similarity(guide_booking.normalize_arabic(p.title_ar), guide_booking.normalize_arabic(${q})),
          similarity(coalesce(p.title_en, ''), ${q})
        ) AS rank,
        p.guide_id, p.duration_hours, p.price, p.max_people
      FROM guide_booking.tour_packages p
      WHERE (
        similarity(guide_booking.normalize_arabic(p.title_ar), guide_booking.normalize_arabic(${q})) > 0.3
        OR similarity(coalesce(p.title_en, ''), ${q}) > 0.3
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
    return `gb:search:${q}:${limit}:${offset}`;
  }
}
