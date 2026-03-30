# T31: Guide + Map Search Indexes — Design Spec

## Overview

Add full-text search capabilities to the guide-booking and map services, following the existing market service pattern. This enables the unified search to include guides, attractions, tour packages, and POIs.

**Scope:** Small (S)
**Dependencies:** T27 (Integration: Guide+Map)
**Services affected:** guide-booking, map, identity (unified search config)

## 1. Database Schema Changes

### 1.1 Guide-Booking Service (`guide_booking` schema)

#### normalize_arabic Function

Custom migration to create Arabic text normalization function (identical to market schema):

```sql
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

#### Search Vector Columns

| Table | Column | Composition |
|-------|--------|-------------|
| `guides` | `search_vector` | `bio_ar` (A), `bio_en` (A) |
| `attractions` | `search_vector` | `name_ar` (A), `name_en` (A), `description_ar` (B), `description_en` (B), `history_ar` (B) |
| `tour_packages` | `search_vector` | `title_ar` (A), `title_en` (A), `description` (B) |

All search_vector columns are **generated stored columns** with GIN indexes.

Example for attractions:

```sql
ALTER TABLE guide_booking.attractions
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce(name_ar, ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce(description_ar, ''))), 'B') ||
  setweight(to_tsvector('simple', coalesce(description_en, '')), 'B') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce(history_ar, ''))), 'B')
) STORED;

CREATE INDEX idx_attractions_search ON guide_booking.attractions USING gin(search_vector);
```

### 1.2 Map Service (`map` schema)

#### normalize_arabic Function

Same function as guide_booking schema (schema isolation).

#### Search Vector Column

| Table | Column | Composition |
|-------|--------|-------------|
| `points_of_interest` | `search_vector` | `name_ar` (A), `name_en` (A), `description` (B), `address` (B) |

```sql
ALTER TABLE map.points_of_interest
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce(name_ar, ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce(description, ''))), 'B') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce(address, ''))), 'B')
) STORED;

CREATE INDEX idx_pois_search ON map.points_of_interest USING gin(search_vector);
```

## 2. Search Service Implementation

### 2.1 Guide-Booking SearchService

New module: `services/guide-booking/src/search/`

```
search/
├── search.module.ts
├── search.service.ts
├── search.controller.ts
└── types.ts
```

**SearchService** methods:
- `search(q, limit, offset)` → `ServiceSearchResponse`
- `searchGuides(q, limit)` → full-text search on guides.search_vector
- `searchAttractions(q, limit)` → full-text search on attractions.search_vector
- `searchPackages(q, limit)` → full-text search on tour_packages.search_vector
- `fuzzySearchGuides(q, limit, excludeIds)` → pg_trgm fallback
- `fuzzySearchAttractions(q, limit, excludeIds)` → pg_trgm fallback
- `fuzzySearchPackages(q, limit, excludeIds)` → pg_trgm fallback

**Search logic:**
1. Run full-text search on all three tables in parallel
2. Merge results by rank
3. If results < limit, run fuzzy search on remaining slots
4. Cache results in Redis (`gb:search:{q}:{limit}:{offset}`, TTL 300s)

**Filters applied:**
- Guides: `active = true`, `deleted_at IS NULL`
- Attractions: `is_active = true`, `deleted_at IS NULL`
- Packages: `status = 'active'`, `deleted_at IS NULL`

### 2.2 Map SearchService

New module: `services/map/src/search/`

```
search/
├── search.module.ts
├── search.service.ts
├── search.controller.ts
└── types.ts
```

**SearchService** methods:
- `search(q, limit, offset)` → `ServiceSearchResponse`
- `searchPois(q, limit)` → full-text search
- `fuzzySearchPois(q, limit, excludeIds)` → pg_trgm fallback

**Filters applied:**
- POIs: `status = 'approved'`, `deleted_at IS NULL`

**Cache:** `map:search:{q}:{limit}:{offset}`, TTL 300s

## 3. Internal Search Endpoints

### 3.1 Guide-Booking Service

```
GET /internal/search?q={query}&limit={limit}&offset={offset}
```

**Headers:** `x-internal-secret` (validated against `INTERNAL_SECRET` env var)

**Response:** `ServiceSearchResponse`
```typescript
{
  data: SearchResult[],  // type: 'guide' | 'attraction' | 'package'
  hasMore: boolean,
  query: string
}
```

**SearchResult metadata by type:**
- `guide`: `{ languages, specialties, areas, basePrice, rating }`
- `attraction`: `{ type, area, difficulty, rating }`
- `package`: `{ guideId, durationHours, price, maxPeople }`

### 3.2 Map Service

```
GET /internal/search?q={query}&limit={limit}&offset={offset}
```

**SearchResult metadata:**
- `poi`: `{ category, status, rating }`

## 4. Unified Search Integration

### 4.1 Update search-services.config.ts

Uncomment and enable the guide-booking and map service configurations:

```typescript
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

### 4.2 Environment Variables

Add to `.env.example`:
```
GUIDE_BOOKING_SERVICE_URL=http://localhost:8003
MAP_SERVICE_URL=http://localhost:8004
```

## 5. Drizzle Schema Updates

Update the Drizzle schema files to include the search_vector columns for type safety:

### guides.ts
```typescript
searchVector: text('search_vector'), // Generated column, read-only
```

Note: Drizzle doesn't have native tsvector support, so we declare as text and handle in raw SQL. The column is generated, so it's never written by application code.

## 6. Testing Strategy

### 6.1 Unit Tests

- SearchService methods return correct result types
- Fuzzy fallback triggers when full-text results < limit
- Cache key generation is correct
- Filters exclude inactive/deleted records

### 6.2 E2E Tests

File: `services/guide-booking/test/search.e2e-spec.ts`
File: `services/map/test/search.e2e-spec.ts`

Test cases:
- `GET /internal/search` returns results for Arabic query
- `GET /internal/search` returns results for English query
- Results include correct metadata per type
- Pagination works (offset/limit)
- Empty query returns empty results
- Internal secret validation (401 without header)

### 6.3 Integration Tests

- Unified search includes guide-booking results
- Unified search includes map results
- Type filtering works (`?type=guide,attraction`)

## 7. Migration Order

1. `guide-booking`: `drizzle-kit generate --custom --name=normalize-arabic-fn`
2. `guide-booking`: Update schema files with search_vector columns
3. `guide-booking`: `drizzle-kit generate` (adds columns + indexes)
4. `map`: `drizzle-kit generate --custom --name=normalize-arabic-fn`
5. `map`: Update schema files with search_vector columns
6. `map`: `drizzle-kit generate` (adds columns + indexes)
7. Run migrations: `pnpm --filter @hena-wadeena/guide-booking migrate`
8. Run migrations: `pnpm --filter @hena-wadeena/map migrate`

## 8. Files to Create/Modify

### New Files
- `services/guide-booking/drizzle/XXXX_normalize-arabic-fn.sql`
- `services/guide-booking/src/search/search.module.ts`
- `services/guide-booking/src/search/search.service.ts`
- `services/guide-booking/src/search/search.controller.ts`
- `services/guide-booking/src/search/types.ts`
- `services/guide-booking/test/search.e2e-spec.ts`
- `services/map/drizzle/XXXX_normalize-arabic-fn.sql`
- `services/map/src/search/search.module.ts`
- `services/map/src/search/search.service.ts`
- `services/map/src/search/search.controller.ts`
- `services/map/src/search/types.ts`
- `services/map/test/search.e2e-spec.ts`

### Modified Files
- `services/guide-booking/src/db/schema/guides.ts` (add search_vector)
- `services/guide-booking/src/db/schema/attractions.ts` (add search_vector)
- `services/guide-booking/src/db/schema/tour-packages.ts` (add search_vector)
- `services/guide-booking/src/db/schema/index.ts` (export types)
- `services/guide-booking/src/app.module.ts` (import SearchModule)
- `services/map/src/db/schema/points-of-interest.ts` (add search_vector)
- `services/map/src/db/schema/index.ts` (export types)
- `services/map/src/app.module.ts` (import SearchModule)
- `services/identity/src/unified-search/search-services.config.ts` (enable services)
- `.env.example` (add service URLs)

## 9. Success Criteria

- [ ] Full-text search works for Arabic text with diacritics stripped
- [ ] Full-text search works for English text
- [ ] Fuzzy fallback activates for partial matches
- [ ] All four entity types appear in unified search
- [ ] Type filtering works in unified search
- [ ] Redis caching reduces DB load on repeated queries
- [ ] E2E tests pass for both services
- [ ] No cross-schema dependencies (each schema has its own normalize_arabic)
