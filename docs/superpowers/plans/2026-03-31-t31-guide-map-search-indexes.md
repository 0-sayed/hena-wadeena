# T31: Guide + Map Search Indexes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search with Arabic normalization to guide-booking and map services, enabling unified search across guides, attractions, tour packages, and POIs.

**Architecture:** Each service gets a `normalize_arabic()` SQL function, generated `search_vector` tsvector columns with GIN indexes, and a `/internal/search` endpoint. The identity service's unified search fans out to these endpoints.

**Tech Stack:** PostgreSQL tsvector/GIN, pg_trgm for fuzzy fallback, Drizzle ORM, NestJS, Redis caching

---

## File Structure

### Guide-Booking Service

```
services/guide-booking/
├── drizzle/
│   └── YYYYMMDDHHMMSS_normalize-arabic-fn.sql  (custom migration)
├── src/
│   ├── db/schema/
│   │   ├── guides.ts           (modify: add searchVector)
│   │   ├── attractions.ts      (modify: add searchVector)
│   │   └── tour-packages.ts    (modify: add searchVector)
│   └── search/
│       ├── search.module.ts    (new)
│       ├── search.service.ts   (new)
│       ├── search.controller.ts (new)
│       ├── dto/
│       │   └── search-query.dto.ts (new)
│       └── types.ts            (new)
└── test/
    └── search.e2e-spec.ts      (new)
```

### Map Service

```
services/map/
├── drizzle/
│   └── YYYYMMDDHHMMSS_normalize-arabic-fn.sql  (custom migration)
├── src/
│   ├── db/schema/
│   │   └── points-of-interest.ts (modify: add searchVector)
│   └── search/
│       ├── search.module.ts    (new)
│       ├── search.service.ts   (new)
│       ├── search.controller.ts (new)
│       ├── dto/
│       │   └── search-query.dto.ts (new)
│       └── types.ts            (new)
└── test/
    └── search.e2e-spec.ts      (new)
```

### Identity Service

```
services/identity/src/unified-search/
└── search-services.config.ts   (modify: enable guide-booking and map)
```

---

## Task 1: Guide-Booking — normalize_arabic Custom Migration

**Files:**
- Create: `services/guide-booking/drizzle/YYYYMMDDHHMMSS_normalize-arabic-fn.sql`

- [ ] **Step 1: Create the custom migration file**

```bash
cd services/guide-booking && pnpm drizzle-kit generate --custom --name=normalize-arabic-fn
```

Expected: Creates a new empty SQL file in `drizzle/` with timestamp prefix.

- [ ] **Step 2: Add normalize_arabic function to migration**

Edit the generated file to contain:

```sql
-- Arabic text normalization function for full-text search
-- Strips diacritics, normalizes alef variants, converts taa marbuta, removes tatweel

CREATE OR REPLACE FUNCTION guide_booking.normalize_arabic(input text)
RETURNS text AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          input,
          '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]',
          '', 'g'
        ),
        '[\u0622\u0623\u0625]', 'ا', 'g'
      ),
      'ة', 'ه', 'g'
    ),
    'ـ', '', 'g'
  );
$$ LANGUAGE sql IMMUTABLE STRICT;
```

- [ ] **Step 3: Run the migration**

```bash
cd services/guide-booking && pnpm migrate
```

Expected: Migration applies successfully, function created in guide_booking schema.

- [ ] **Step 4: Verify function works**

```bash
docker exec -it hena-wadeena-postgres-1 psql -U postgres -d hena_wadeena -c "SELECT guide_booking.normalize_arabic('فُنْدُق');"
```

Expected: Returns `فندق` (without diacritics).

- [ ] **Step 5: Commit**

```bash
git add services/guide-booking/drizzle/ && git commit -m "$(cat <<'EOF'
feat(guide-booking): add normalize_arabic function for search

Custom migration to create Arabic text normalization function that
strips diacritics, normalizes alef variants, and removes tatweel.
EOF
)"
```

---

## Task 2: Guide-Booking — Schema Updates for search_vector Columns

**Files:**
- Modify: `services/guide-booking/src/db/schema/guides.ts`
- Modify: `services/guide-booking/src/db/schema/attractions.ts`
- Modify: `services/guide-booking/src/db/schema/tour-packages.ts`

- [ ] **Step 1: Add searchVector to guides schema**

In `services/guide-booking/src/db/schema/guides.ts`, add after `deletedAt`:

```typescript
searchVector: text('search_vector'),
```

Note: This is a generated column in PostgreSQL but Drizzle declares it as text for type safety. The actual generation happens in the migration.

- [ ] **Step 2: Add searchVector to attractions schema**

In `services/guide-booking/src/db/schema/attractions.ts`, add after `deletedAt`:

```typescript
searchVector: text('search_vector'),
```

- [ ] **Step 3: Add searchVector to tour-packages schema**

In `services/guide-booking/src/db/schema/tour-packages.ts`, add after `deletedAt`:

```typescript
searchVector: text('search_vector'),
```

- [ ] **Step 4: Generate the migration**

```bash
cd services/guide-booking && pnpm drizzle-kit generate
```

Expected: Creates a new migration file adding the three columns.

- [ ] **Step 5: Edit generated migration to use generated columns**

The generated migration will have plain `ADD COLUMN` statements. Replace them with generated column definitions:

```sql
-- guides.search_vector
ALTER TABLE "guide_booking"."guides"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("bio_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("bio_en", '')), 'A')
) STORED;

CREATE INDEX "idx_guides_search" ON "guide_booking"."guides" USING gin("search_vector");

-- attractions.search_vector
ALTER TABLE "guide_booking"."attractions"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("name_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("name_en", '')), 'A') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("description_ar", ''))), 'B') ||
  setweight(to_tsvector('simple', coalesce("description_en", '')), 'B') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("history_ar", ''))), 'B')
) STORED;

CREATE INDEX "idx_attractions_search" ON "guide_booking"."attractions" USING gin("search_vector");

-- tour_packages.search_vector
ALTER TABLE "guide_booking"."tour_packages"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("title_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("title_en", '')), 'A') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("description", ''))), 'B')
) STORED;

CREATE INDEX "idx_tour_packages_search" ON "guide_booking"."tour_packages" USING gin("search_vector");
```

- [ ] **Step 6: Run the migration**

```bash
cd services/guide-booking && pnpm migrate
```

Expected: Migration applies, columns and indexes created.

- [ ] **Step 7: Verify indexes exist**

```bash
docker exec -it hena-wadeena-postgres-1 psql -U postgres -d hena_wadeena -c "\di guide_booking.*search*"
```

Expected: Shows idx_guides_search, idx_attractions_search, idx_tour_packages_search.

- [ ] **Step 8: Commit**

```bash
git add services/guide-booking/ && git commit -m "$(cat <<'EOF'
feat(guide-booking): add search_vector columns with GIN indexes

Adds generated tsvector columns to guides, attractions, and tour_packages
tables for full-text search. Uses normalize_arabic for Arabic text and
weighted search (A for titles/names, B for descriptions).
EOF
)"
```

---

## Task 3: Guide-Booking — Search Module Setup

**Files:**
- Create: `services/guide-booking/src/search/types.ts`
- Create: `services/guide-booking/src/search/dto/search-query.dto.ts`
- Create: `services/guide-booking/src/search/search.module.ts`

- [ ] **Step 1: Create types.ts**

Create `services/guide-booking/src/search/types.ts`:

```typescript
// Re-export shared search types — canonical definitions live in @hena-wadeena/types
export type { SearchResult, ServiceSearchResponse as SearchResponse } from '@hena-wadeena/types';
```

- [ ] **Step 2: Create search-query.dto.ts**

Create `services/guide-booking/src/search/dto/search-query.dto.ts`:

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or fewer'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export class SearchQueryDto extends createZodDto(SearchQuerySchema) {}
```

- [ ] **Step 3: Create search.module.ts**

Create `services/guide-booking/src/search/search.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

- [ ] **Step 4: Commit**

```bash
git add services/guide-booking/src/search/ && git commit -m "$(cat <<'EOF'
feat(guide-booking): add search module scaffolding

Adds types, DTO, and module definition for internal search endpoint.
EOF
)"
```

---

## Task 4: Guide-Booking — Search Service Implementation

**Files:**
- Create: `services/guide-booking/src/search/search.service.ts`

- [ ] **Step 1: Create search.service.ts**

Create `services/guide-booking/src/search/search.service.ts`:

```typescript
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
    return `search:${q}:${limit}:${offset}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/guide-booking/src/search/search.service.ts && git commit -m "$(cat <<'EOF'
feat(guide-booking): implement search service

Full-text search with fuzzy fallback for guides, attractions, and
tour packages. Uses tsvector with Arabic normalization and pg_trgm
similarity for partial matches. Results cached in Redis for 5 minutes.
EOF
)"
```

---

## Task 5: Guide-Booking — Search Controller

**Files:**
- Create: `services/guide-booking/src/search/search.controller.ts`
- Modify: `services/guide-booking/src/app.module.ts`

- [ ] **Step 1: Create search.controller.ts**

Create `services/guide-booking/src/search/search.controller.ts`:

```typescript
import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';
import type { SearchResponse } from './types';

@Controller('internal/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
```

- [ ] **Step 2: Add SearchModule to AppModule**

In `services/guide-booking/src/app.module.ts`, add the import:

```typescript
import { SearchModule } from './search/search.module';
```

And add `SearchModule` to the imports array after `StatsModule`.

- [ ] **Step 3: Verify service starts**

```bash
cd services/guide-booking && pnpm dev &
sleep 5
curl -s http://localhost:8003/health | jq .
pkill -f "guide-booking"
```

Expected: Health check returns `{"status":"ok"}`.

- [ ] **Step 4: Commit**

```bash
git add services/guide-booking/src/ && git commit -m "$(cat <<'EOF'
feat(guide-booking): add internal search controller

Exposes /internal/search endpoint protected by InternalGuard.
Wires SearchModule into the application.
EOF
)"
```

---

## Task 6: Guide-Booking — E2E Tests

**Files:**
- Create: `services/guide-booking/test/search.e2e-spec.ts`

- [ ] **Step 1: Create search.e2e-spec.ts**

Create `services/guide-booking/test/search.e2e-spec.ts`:

```typescript
import { generateId } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { attractions } from '../src/db/schema/attractions';
import { bookings } from '../src/db/schema/bookings';
import { guideAvailability } from '../src/db/schema/guide-availability';
import { guideReviewHelpfulVotes } from '../src/db/schema/guide-review-helpful-votes';
import { guides } from '../src/db/schema/guides';
import { reviews } from '../src/db/schema/reviews';
import { tourPackageAttractions } from '../src/db/schema/tour-package-attractions';
import { tourPackages } from '../src/db/schema/tour-packages';

import { GUIDE_USER_ID, type E2eContext, createE2eApp } from './e2e-helpers';

process.env.INTERNAL_SECRET ??= 'test-internal-secret';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

describe('Internal Search (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    // Delete in FK-safe order
    await ctx.db.delete(guideReviewHelpfulVotes);
    await ctx.db.delete(reviews);
    await ctx.db.delete(bookings);
    await ctx.db.delete(guideAvailability);
    await ctx.db.delete(tourPackageAttractions);
    await ctx.db.delete(tourPackages);
    await ctx.db.delete(guides);
    await ctx.db.delete(attractions);
    await ctx.redis.flushdb();
  });

  async function seedGuide(overrides: Partial<typeof guides.$inferInsert> = {}) {
    const [row] = await ctx.db
      .insert(guides)
      .values({
        userId: GUIDE_USER_ID,
        bioAr: 'مرشد سياحي خبير في الصحراء الغربية',
        bioEn: 'Expert desert tour guide',
        languages: ['ar', 'en'],
        specialties: ['desert', 'history'],
        areasOfOperation: ['al_kharga', 'al_dakhla'],
        licenseNumber: `LIC-${generateId()}`,
        basePrice: 50000,
        active: true,
        ...overrides,
      })
      .returning();
    return row!;
  }

  async function seedAttraction(overrides: Partial<typeof attractions.$inferInsert> = {}) {
    const [row] = await ctx.db
      .insert(attractions)
      .values({
        nameAr: 'معبد هيبس',
        nameEn: 'Temple of Hibis',
        slug: `attraction-${generateId()}`,
        type: 'temple',
        area: 'al_kharga',
        descriptionAr: 'معبد فرعوني قديم في الخارجة',
        descriptionEn: 'Ancient pharaonic temple in Kharga',
        isActive: true,
        ...overrides,
      })
      .returning();
    return row!;
  }

  async function seedPackage(guideId: string, overrides: Partial<typeof tourPackages.$inferInsert> = {}) {
    const [row] = await ctx.db
      .insert(tourPackages)
      .values({
        guideId,
        titleAr: 'جولة الصحراء الكبرى',
        titleEn: 'Grand Desert Tour',
        description: 'جولة شاملة في الصحراء الغربية',
        durationHours: 8,
        maxPeople: 10,
        price: 100000,
        status: 'active',
        ...overrides,
      })
      .returning();
    return row!;
  }

  describe('GET /api/v1/internal/search', () => {
    it('returns 403 without X-Internal-Secret header', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/internal/search?q=test').expect(403);
    });

    it('returns 400 when q is missing', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(400);
    });

    it('finds guide by Arabic bio', async () => {
      await seedGuide();

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('صحراء')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].type).toBe('guide');
    });

    it('finds attraction by Arabic name', async () => {
      await seedAttraction();

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('معبد')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].type).toBe('attraction');
      expect(res.body.data[0].title.ar).toContain('معبد');
    });

    it('finds package by English title', async () => {
      const guide = await seedGuide();
      await seedPackage(guide.id);

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=desert')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      const packageResult = res.body.data.find((r: { type: string }) => r.type === 'package');
      expect(packageResult).toBeDefined();
      expect(packageResult.title.en).toContain('Desert');
    });

    it('normalizes Arabic diacritics in search', async () => {
      await seedAttraction({ nameAr: 'معبد', descriptionAr: 'وصف المعبد' });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('مَعْبَد')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('returns results from all entity types', async () => {
      const guide = await seedGuide({ bioAr: 'الوادي الجديد مرشد' });
      await seedAttraction({ nameAr: 'الوادي الجديد معلم', slug: `cross-${generateId()}` });
      await seedPackage(guide.id, { titleAr: 'الوادي الجديد جولة' });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('الوادي')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      const types = (res.body.data as { type: string }[]).map((r) => r.type);
      expect(types).toContain('guide');
      expect(types).toContain('attraction');
      expect(types).toContain('package');
    });

    it('excludes inactive guides', async () => {
      await seedGuide({ active: false });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('صحراء')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 4; i++) {
        await seedAttraction({
          nameAr: `معبد ${i}`,
          slug: `page-${i}-${generateId()}`,
        });
      }

      const page1 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('معبد')}&limit=2&offset=0`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(page1.body.data.length).toBe(2);

      const page2 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('معبد')}&limit=2&offset=2`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(page2.body.data.length).toBe(2);

      const page1Ids = (page1.body.data as { id: string }[]).map((r) => r.id);
      const page2Ids = (page2.body.data as { id: string }[]).map((r) => r.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('returns 200 with empty data for no matches', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('zzzznotfound')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd services/guide-booking && pnpm test test/search.e2e-spec.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/guide-booking/test/search.e2e-spec.ts && git commit -m "$(cat <<'EOF'
test(guide-booking): add e2e tests for internal search

Tests cover Arabic/English search, diacritic normalization,
multi-entity results, filtering, and pagination.
EOF
)"
```

---

## Task 7: Map — normalize_arabic Custom Migration

**Files:**
- Create: `services/map/drizzle/YYYYMMDDHHMMSS_normalize-arabic-fn.sql`

- [ ] **Step 1: Create the custom migration file**

```bash
cd services/map && pnpm drizzle-kit generate --custom --name=normalize-arabic-fn
```

- [ ] **Step 2: Add normalize_arabic function to migration**

Edit the generated file:

```sql
-- Arabic text normalization function for full-text search
-- Strips diacritics, normalizes alef variants, converts taa marbuta, removes tatweel

CREATE OR REPLACE FUNCTION map.normalize_arabic(input text)
RETURNS text AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          input,
          '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]',
          '', 'g'
        ),
        '[\u0622\u0623\u0625]', 'ا', 'g'
      ),
      'ة', 'ه', 'g'
    ),
    'ـ', '', 'g'
  );
$$ LANGUAGE sql IMMUTABLE STRICT;
```

- [ ] **Step 3: Run the migration**

```bash
cd services/map && pnpm migrate
```

- [ ] **Step 4: Verify function works**

```bash
docker exec -it hena-wadeena-postgres-1 psql -U postgres -d hena_wadeena -c "SELECT map.normalize_arabic('مَطْعَم');"
```

Expected: Returns `مطعم`.

- [ ] **Step 5: Commit**

```bash
git add services/map/drizzle/ && git commit -m "$(cat <<'EOF'
feat(map): add normalize_arabic function for search

Custom migration to create Arabic text normalization function.
EOF
)"
```

---

## Task 8: Map — Schema Update for search_vector Column

**Files:**
- Modify: `services/map/src/db/schema/points-of-interest.ts`

- [ ] **Step 1: Add searchVector to points-of-interest schema**

In `services/map/src/db/schema/points-of-interest.ts`, add after `deletedAt`:

```typescript
searchVector: text('search_vector'),
```

- [ ] **Step 2: Generate the migration**

```bash
cd services/map && pnpm drizzle-kit generate
```

- [ ] **Step 3: Edit generated migration to use generated column**

Replace the ADD COLUMN statement with:

```sql
ALTER TABLE "map"."points_of_interest"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce("name_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("name_en", '')), 'A') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce("description", ''))), 'B') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce("address", ''))), 'B')
) STORED;

CREATE INDEX "idx_pois_search" ON "map"."points_of_interest" USING gin("search_vector");
```

- [ ] **Step 4: Run the migration**

```bash
cd services/map && pnpm migrate
```

- [ ] **Step 5: Verify index exists**

```bash
docker exec -it hena-wadeena-postgres-1 psql -U postgres -d hena_wadeena -c "\di map.*search*"
```

Expected: Shows idx_pois_search.

- [ ] **Step 6: Commit**

```bash
git add services/map/ && git commit -m "$(cat <<'EOF'
feat(map): add search_vector column with GIN index to POIs

Adds generated tsvector column to points_of_interest for full-text
search with Arabic normalization.
EOF
)"
```

---

## Task 9: Map — Search Module Implementation

**Files:**
- Create: `services/map/src/search/types.ts`
- Create: `services/map/src/search/dto/search-query.dto.ts`
- Create: `services/map/src/search/search.module.ts`
- Create: `services/map/src/search/search.service.ts`
- Create: `services/map/src/search/search.controller.ts`
- Modify: `services/map/src/app.module.ts`

- [ ] **Step 1: Create types.ts**

Create `services/map/src/search/types.ts`:

```typescript
export type { SearchResult, ServiceSearchResponse as SearchResponse } from '@hena-wadeena/types';
```

- [ ] **Step 2: Create search-query.dto.ts**

Create `services/map/src/search/dto/search-query.dto.ts`:

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or fewer'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export class SearchQueryDto extends createZodDto(SearchQuerySchema) {}
```

- [ ] **Step 3: Create search.module.ts**

Create `services/map/src/search/search.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

- [ ] **Step 4: Create search.service.ts**

Create `services/map/src/search/search.service.ts`:

```typescript
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
    return `search:${q}:${limit}:${offset}`;
  }
}
```

- [ ] **Step 5: Create search.controller.ts**

Create `services/map/src/search/search.controller.ts`:

```typescript
import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';
import type { SearchResponse } from './types';

@Controller('internal/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
```

- [ ] **Step 6: Add SearchModule to AppModule**

In `services/map/src/app.module.ts`, add the import:

```typescript
import { SearchModule } from './search/search.module';
```

And add `SearchModule` to the imports array after `StatsModule`.

- [ ] **Step 7: Commit**

```bash
git add services/map/src/ && git commit -m "$(cat <<'EOF'
feat(map): implement search module for POIs

Adds internal search endpoint with full-text search and fuzzy fallback
for points of interest. Results cached in Redis for 5 minutes.
EOF
)"
```

---

## Task 10: Map — E2E Tests

**Files:**
- Create: `services/map/test/search.e2e-spec.ts`

- [ ] **Step 1: Create search.e2e-spec.ts**

Create `services/map/test/search.e2e-spec.ts`:

```typescript
import { generateId } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { carpoolPassengers } from '../src/db/schema/carpool-passengers';
import { carpoolRides } from '../src/db/schema/carpool-rides';
import { pointsOfInterest } from '../src/db/schema/points-of-interest';

import { RESIDENT_ID, type E2eContext, createE2eApp } from './e2e-helpers';

process.env.INTERNAL_SECRET ??= 'test-internal-secret';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

describe('Internal Search (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await ctx.db.delete(carpoolPassengers);
    await ctx.db.delete(carpoolRides);
    await ctx.db.delete(pointsOfInterest);
    await ctx.redis.flushdb();
  });

  async function seedPoi(overrides: Partial<typeof pointsOfInterest.$inferInsert> = {}) {
    const [row] = await ctx.db
      .insert(pointsOfInterest)
      .values({
        nameAr: 'مطعم الواحة',
        nameEn: 'Oasis Restaurant',
        description: 'مطعم تقليدي في الخارجة يقدم أطباق محلية',
        category: 'restaurant',
        location: { x: 30.5503, y: 25.4379 },
        status: 'approved',
        submittedBy: RESIDENT_ID,
        ...overrides,
      })
      .returning();
    return row!;
  }

  describe('GET /api/v1/internal/search', () => {
    it('returns 403 without X-Internal-Secret header', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/internal/search?q=test').expect(403);
    });

    it('returns 400 when q is missing', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(400);
    });

    it('finds POI by Arabic name', async () => {
      await seedPoi();

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('مطعم')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].type).toBe('poi');
      expect(res.body.data[0].title.ar).toContain('مطعم');
    });

    it('finds POI by English name', async () => {
      await seedPoi();

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=restaurant')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title.en).toContain('Restaurant');
    });

    it('normalizes Arabic diacritics in search', async () => {
      await seedPoi({ nameAr: 'مطعم' });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('مَطْعَم')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('excludes pending POIs', async () => {
      await seedPoi({ status: 'pending' });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('مطعم')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 4; i++) {
        await seedPoi({ nameAr: `مطعم ${i}` });
      }

      const page1 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('مطعم')}&limit=2&offset=0`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(page1.body.data.length).toBe(2);

      const page2 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('مطعم')}&limit=2&offset=2`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(page2.body.data.length).toBe(2);

      const page1Ids = (page1.body.data as { id: string }[]).map((r) => r.id);
      const page2Ids = (page2.body.data as { id: string }[]).map((r) => r.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('returns 200 with empty data for no matches', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('zzzznotfound')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd services/map && pnpm test test/search.e2e-spec.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/map/test/search.e2e-spec.ts && git commit -m "$(cat <<'EOF'
test(map): add e2e tests for internal search

Tests cover Arabic/English search, diacritic normalization,
status filtering, and pagination for POIs.
EOF
)"
```

---

## Task 11: Identity — Enable Guide-Booking and Map in Unified Search

**Files:**
- Modify: `services/identity/src/unified-search/search-services.config.ts`

- [ ] **Step 1: Uncomment guide-booking and map services**

Edit `services/identity/src/unified-search/search-services.config.ts`:

```typescript
import type { SearchResultType } from '@hena-wadeena/types';

export interface SearchServiceConfig {
  name: string;
  url: string;
  types: SearchResultType[];
}

export const EXTERNAL_SEARCH_SERVICES: SearchServiceConfig[] = [
  {
    name: 'market',
    url: process.env.MARKET_SERVICE_URL ?? 'http://localhost:8002',
    types: ['listing', 'opportunity', 'business'],
  },
  {
    name: 'guide-booking',
    url: process.env.GUIDE_BOOKING_SERVICE_URL ?? 'http://localhost:8003',
    types: ['guide', 'attraction', 'package'],
  },
  {
    name: 'map',
    url: process.env.MAP_SERVICE_URL ?? 'http://localhost:8004',
    types: ['poi'],
  },
];
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @hena-wadeena/identity typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add services/identity/src/unified-search/search-services.config.ts && git commit -m "$(cat <<'EOF'
feat(identity): enable guide-booking and map in unified search

Adds guide-booking and map services to the unified search fan-out
configuration, enabling guides, attractions, packages, and POIs
in search results.
EOF
)"
```

---

## Task 12: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add service URL environment variables**

Add to `.env.example` in the service URLs section (if not already present):

```bash
# Service URLs (for unified search fan-out)
MARKET_SERVICE_URL=http://localhost:8002
GUIDE_BOOKING_SERVICE_URL=http://localhost:8003
MAP_SERVICE_URL=http://localhost:8004
```

- [ ] **Step 2: Commit**

```bash
git add .env.example && git commit -m "$(cat <<'EOF'
docs: add service URLs to .env.example

Documents GUIDE_BOOKING_SERVICE_URL and MAP_SERVICE_URL for
unified search configuration.
EOF
)"
```

---

## Task 13: Final Validation

- [ ] **Step 1: Run all service tests**

```bash
pnpm --filter @hena-wadeena/guide-booking test
pnpm --filter @hena-wadeena/map test
```

Expected: All tests pass.

- [ ] **Step 2: Run type-check across all packages**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No errors (warnings are acceptable).

- [ ] **Step 4: Run full validation**

```bash
pnpm validate
```

Expected: All checks pass.

- [ ] **Step 5: Manual integration test (optional)**

Start all services and test unified search:

```bash
# Terminal 1: Start services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
pnpm dev

# Terminal 2: Test unified search (after seeding data)
curl -s "http://localhost:8001/api/v1/search?q=صحراء" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].type'
```

Expected: Returns results with types including 'guide', 'attraction', 'package', 'poi'.

---

## Summary

| Task | Service | Description |
|------|---------|-------------|
| 1 | guide-booking | normalize_arabic custom migration |
| 2 | guide-booking | search_vector columns + GIN indexes |
| 3 | guide-booking | Search module scaffolding |
| 4 | guide-booking | Search service implementation |
| 5 | guide-booking | Search controller + AppModule wiring |
| 6 | guide-booking | E2E tests |
| 7 | map | normalize_arabic custom migration |
| 8 | map | search_vector column + GIN index |
| 9 | map | Search module (service, controller, dto) |
| 10 | map | E2E tests |
| 11 | identity | Enable services in unified search config |
| 12 | root | Update .env.example |
| 13 | all | Final validation |
