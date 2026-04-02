import { DRIZZLE_CLIENT, S3Service, generateId } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { listings } from '../src/db/schema/listings';

type InsertListing = typeof listings.$inferInsert;

// Must match what ConfigModule captured from .env at module import time (before beforeAll runs).
// vitest.e2e.config.ts runs dotenv before test files are loaded, so process.env reflects .env here.
const TEST_JWT_SECRET =
  process.env['JWT_ACCESS_SECRET'] ?? 'dev-access-secret-32-chars-minimum-here';

// User IDs used across tests — fixed UUIDs so ownership can be asserted deterministically
const MERCHANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
const OTHER_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000002';
const ADMIN_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000003';
const TOURIST_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000004';

// Minimal valid create payload — uses real enum values from the market schema
const BASE_PAYLOAD = {
  titleAr: 'شقة للإيجار في الخارجة',
  titleEn: 'Apartment for Rent in Kharga',
  price: 150000, // 1500 EGP in piasters
  category: 'accommodation',
  listingType: 'real_estate',
  transaction: 'rent',
};

describe('Listings (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let db: PostgresJsDatabase;
  let jtiSeq = 0;

  function makeToken(sub: string, role: string): string {
    // jti must be unique per token to avoid false blacklist hits in Redis
    const jti = `test-jti-${++jtiSeq}`;
    return `Bearer ${jwtService.sign({ sub, role, email: `${role}@test.com`, jti })}`;
  }

  const merchantToken = () => makeToken(MERCHANT_ID, UserRole.MERCHANT);
  const otherMerchantToken = () => makeToken(OTHER_ID, UserRole.MERCHANT);
  const adminToken = () => makeToken(ADMIN_ID, UserRole.ADMIN);
  const touristToken = () => makeToken(TOURIST_ID, UserRole.TOURIST);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Disable throttling — test suite exceeds per-route limits within a single 60s window
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      // Mock S3 — avoid real AWS calls; S3Service.getPresignedUploadUrl is tested by shape
      .overrideProvider(S3Service)
      .useValue({
        getPresignedUploadUrl: vi.fn().mockResolvedValue({
          uploadUrl: 'https://s3.example.com/test-presigned-url',
          key: 'market/listings/test-id/test-file.jpg',
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // Mirror production setup (configureApp), but call init() not listen() to work with supertest
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();

    // JwtService signs tokens with the same secret that JwtStrategy validates against
    jwtService = new JwtService({ secret: TEST_JWT_SECRET });

    // Drizzle client for direct DB operations (truncation between tests)
    db = app.get<PostgresJsDatabase>(DRIZZLE_CLIENT);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean slate for each test — delete all listings (no FK deps in these tests)
    await db.delete(listings);
  });

  // ---------------------------------------------------------------------------
  // CRUD flow
  // ---------------------------------------------------------------------------

  describe('CRUD flow', () => {
    it('creates a listing in draft status and owner can read/update/delete it', async () => {
      // Create
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;
      expect(id).toBeDefined();
      expect(createRes.body.status).toBe('draft');
      expect(createRes.body.ownerId).toBe(MERCHANT_ID);
      expect(createRes.body.slug).toBeDefined();
      expect(createRes.body.titleEn).toBe(BASE_PAYLOAD.titleEn);
      expect(createRes.body.price).toBe(BASE_PAYLOAD.price);

      // Owner can read their own draft
      const readRes = await request(app.getHttpServer())
        .get(`/api/v1/listings/${id}`)
        .set('Authorization', merchantToken())
        .expect(200);
      expect(readRes.body.id).toBe(id);

      // Owner can update
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/listings/${id}`)
        .set('Authorization', merchantToken())
        .send({ titleEn: 'Updated Title' })
        .expect(200);
      expect(patchRes.body.titleEn).toBe('Updated Title');

      // Owner can soft-delete
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${id}`)
        .set('Authorization', merchantToken())
        .expect(200);

      // Deleted listing returns 404 even for owner
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${id}`)
        .set('Authorization', merchantToken())
        .expect(404);
    });

    it('deleted listing is absent from public list (GET /)', async () => {
      // Create and immediately delete
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${id}`)
        .set('Authorization', merchantToken())
        .expect(200);

      // GET / only shows active non-deleted listings — the deleted draft should not appear
      const listRes = await request(app.getHttpServer()).get('/api/v1/listings').expect(200);
      const ids = (listRes.body.data as { id: string }[]).map((l) => l.id);
      expect(ids).not.toContain(id);
    });
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  describe('Auth', () => {
    it('unauthenticated create → 401', async () => {
      await request(app.getHttpServer()).post('/api/v1/listings').send(BASE_PAYLOAD).expect(401);
    });

    it('wrong role (tourist) create → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', touristToken())
        .send(BASE_PAYLOAD)
        .expect(403);
    });

    it('wrong owner PATCH → 403', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      // A different merchant cannot update another merchant's listing
      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${id}`)
        .set('Authorization', otherMerchantToken())
        .send({ titleEn: 'Unauthorized Update' })
        .expect(403);
    });

    it('admin bypasses ownership check on PATCH → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      // Admin is not the owner but should succeed
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/listings/${id}`)
        .set('Authorization', adminToken())
        .send({ titleEn: 'Admin Update' })
        .expect(200);
      expect(patchRes.body.titleEn).toBe('Admin Update');
    });

    it('admin bypasses ownership check on DELETE → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${id}`)
        .set('Authorization', adminToken())
        .expect(200);
    });

    it('unauthenticated PATCH → 401', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/listings/${createRes.body.id as string}`)
        .send({ titleEn: 'No Auth' })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Slug
  // ---------------------------------------------------------------------------

  describe('Slug', () => {
    it('auto-generates slug from titleEn on create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send({ ...BASE_PAYLOAD, titleEn: 'Luxury Desert Villa' })
        .expect(201);

      // Slug should contain the slugified form of the English title
      expect(res.body.slug).toMatch(/luxury-desert-villa/);
    });

    it('auto-generates slug from titleAr when titleEn is absent', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send({
          titleAr: 'مبنى تجاري',
          price: BASE_PAYLOAD.price,
          category: BASE_PAYLOAD.category,
          listingType: BASE_PAYLOAD.listingType,
          transaction: BASE_PAYLOAD.transaction,
        })
        .expect(201);

      expect(res.body.slug).toBeDefined();
      expect(typeof res.body.slug).toBe('string');
      expect(res.body.slug.length).toBeGreaterThan(0);
    });

    it('generates unique slugs when two listings have the same title', async () => {
      const sameTitle = { ...BASE_PAYLOAD, titleEn: 'Duplicate Property Title' };

      const res1 = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(sameTitle)
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(sameTitle)
        .expect(201);

      expect(res1.body.slug).not.toBe(res2.body.slug);
      // Both slugs should contain the base slug
      expect(res1.body.slug).toMatch(/duplicate-property-title/);
      expect(res2.body.slug).toMatch(/duplicate-property-title/);
    });
  });

  // ---------------------------------------------------------------------------
  // Owner visibility
  // ---------------------------------------------------------------------------

  describe('Owner visibility', () => {
    it('unauthenticated request can GET an active listing by id', async () => {
      const listing = await insertActive({ slug: 'public-active-listing', titleEn: 'Public Active Listing' });

      const readRes = await request(app.getHttpServer()).get(`/api/v1/listings/${listing.id}`).expect(200);

      expect(readRes.body.id).toBe(listing.id);
      expect(readRes.body.status).toBe('active');
    });

    it('owner can GET their own draft listing', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;
      expect(createRes.body.status).toBe('draft');

      // Owner retrieves draft — should succeed
      const readRes = await request(app.getHttpServer())
        .get(`/api/v1/listings/${id}`)
        .set('Authorization', merchantToken())
        .expect(200);
      expect(readRes.body.id).toBe(id);
    });

    it('unauthenticated request gets 404 for a draft listing', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      // No token — non-owner visibility → draft listing not visible → 404
      await request(app.getHttpServer()).get(`/api/v1/listings/${id}`).expect(404);
    });

    it("different user gets 404 for another user's draft listing", async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      // Authenticated as a different user — not the owner → draft not visible → 404
      await request(app.getHttpServer())
        .get(`/api/v1/listings/${id}`)
        .set('Authorization', otherMerchantToken())
        .expect(404);
    });

    it('owner can GET their draft listing by slug', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send({ ...BASE_PAYLOAD, titleEn: 'Slug Visibility Test' })
        .expect(201);

      const slug = createRes.body.slug as string;

      // Owner retrieves draft by slug
      await request(app.getHttpServer())
        .get(`/api/v1/listings/slug/${slug}`)
        .set('Authorization', merchantToken())
        .expect(200);

      // Non-owner gets 404
      await request(app.getHttpServer()).get(`/api/v1/listings/slug/${slug}`).expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Helper: insert an active listing directly — POST /api/v1/listings creates
  // `draft` listings only, but filter/pagination/featured queries require `active`.
  // ---------------------------------------------------------------------------

  async function insertActive(overrides: Partial<Omit<InsertListing, 'location'>> = {}) {
    const id = generateId();
    const [row] = await db
      .insert(listings)
      .values({
        id,
        ownerId: MERCHANT_ID,
        titleAr: 'قائمة اختبار',
        titleEn: 'Test Listing',
        price: 100_000,
        category: 'accommodation',
        listingType: 'real_estate',
        transaction: 'rent',
        slug: `active-${id.slice(0, 8)}`,
        status: 'active',
        ...overrides,
      })
      .returning();
    return row;
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  describe('Filters', () => {
    it('filters by category', async () => {
      await insertActive({ category: 'restaurant', slug: 'f-restaurant', titleEn: 'Restaurant A' });
      await insertActive({ category: 'accommodation', slug: 'f-acc', titleEn: 'Accommodation A' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?category=restaurant')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('restaurant');
    });

    it('filters by min_price and max_price', async () => {
      await insertActive({ price: 50_000, slug: 'f-cheap', titleEn: 'Cheap' });
      await insertActive({ price: 200_000, slug: 'f-mid', titleEn: 'Mid' });
      await insertActive({ price: 500_000, slug: 'f-exp', titleEn: 'Expensive' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?min_price=100000&max_price=300000')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].price).toBe(200_000);
    });

    it('filters by area (maps to district column)', async () => {
      await insertActive({ district: 'Kharga', slug: 'f-kharga', titleEn: 'Kharga Listing' });
      await insertActive({ district: 'Dakhla', slug: 'f-dakhla', titleEn: 'Dakhla Listing' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?area=Kharga')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].district).toBe('Kharga');
    });

    it('filters by tags with AND semantics', async () => {
      await insertActive({ tags: ['wifi', 'parking'], slug: 'f-both-tags', titleEn: 'Both Tags' });
      await insertActive({ tags: ['wifi'], slug: 'f-wifi-only', titleEn: 'WiFi Only' });
      await insertActive({ tags: ['parking'], slug: 'f-park-only', titleEn: 'Parking Only' });

      // AND semantics: listing must have BOTH wifi AND parking
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?tags=wifi,parking')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].titleEn).toBe('Both Tags');
    });

    it('applies combined filters correctly', async () => {
      await insertActive({
        category: 'restaurant',
        price: 80_000,
        district: 'Kharga',
        slug: 'f-combo-match',
      });
      await insertActive({
        category: 'restaurant',
        price: 300_000,
        district: 'Kharga',
        slug: 'f-combo-pricey',
      });
      await insertActive({
        category: 'accommodation',
        price: 80_000,
        district: 'Kharga',
        slug: 'f-combo-wrong-cat',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?category=restaurant&max_price=100000&area=Kharga')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].price).toBe(80_000);
      expect(res.body.data[0].category).toBe('restaurant');
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 5 active listings with ascending prices for deterministic sort tests
      for (let i = 0; i < 5; i++) {
        await insertActive({
          price: (i + 1) * 100_000,
          slug: `page-listing-${String(i)}`,
          titleEn: `Listing ${String(i)}`,
        });
      }
    });

    it('returns page 1 with correct total, page, and hasMore fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?limit=3&offset=0')
        .expect(200);

      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(3);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.hasMore).toBe(true);
    });

    it('returns page 2 with correct page field and hasMore=false', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?limit=3&offset=3')
        .expect(200);

      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.hasMore).toBe(false);
    });

    it('sorts by price ascending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?sort=price%7Casc')
        .expect(200);

      const prices = (res.body.data as { price: number }[]).map((l) => l.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('sorts by price descending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?sort=price%7Cdesc')
        .expect(200);

      const prices = (res.body.data as { price: number }[]).map((l) => l.price);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('uses created_at desc as default sort and returns all listings on first page', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/listings').expect(200);

      expect(res.body.data).toHaveLength(5);
      expect(res.body.page).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Geo-nearby
  // ---------------------------------------------------------------------------

  describe('Geo-nearby', () => {
    it('returns listings sorted by distance within radius', async () => {
      // Center: lat=25.44, lng=30.56 (near Kharga)
      // A: exact center (~0 km), B: ~6.7 km north, C: ~84 km north (outside 50 km radius)
      const insertGeo = async (lat: number, lng: number, slug: string, titleEn: string) => {
        const id = generateId();
        await db.insert(listings).values({
          id,
          ownerId: MERCHANT_ID,
          titleAr: 'قائمة جيو',
          titleEn,
          price: 100_000,
          category: 'accommodation',
          listingType: 'real_estate',
          transaction: 'rent',
          slug,
          status: 'active',
          location:
            sql`public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)` as unknown as InsertListing['location'],
        });
      };

      await insertGeo(25.44, 30.56, 'geo-a', 'Geo A (center)');
      await insertGeo(25.5, 30.56, 'geo-b', 'Geo B (6.7km)');
      await insertGeo(26.2, 30.56, 'geo-c', 'Geo C (84km)');

      const res = await request(app.getHttpServer())
        .get('/api/v1/listings/nearby?lat=25.44&lng=30.56&radius_km=50')
        .expect(200);

      expect(res.body.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
      // Distance-ordered: A (0 km) before B (6.7 km)
      expect(res.body.data[0].titleEn).toBe('Geo A (center)');
      expect(res.body.data[1].titleEn).toBe('Geo B (6.7km)');
      expect(res.body.data[0].distance_km).toBeLessThan(res.body.data[1].distance_km);
    });

    it('returns empty results when no listings are within radius', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings/nearby?lat=25.44&lng=30.56&radius_km=1')
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // S3 image upload
  // ---------------------------------------------------------------------------

  describe('S3 image upload', () => {
    it('POST /:id/images returns { uploadUrl, key } for the listing owner', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      const id = createRes.body.id as string;

      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/listings/${id}/images`)
        .set('Authorization', merchantToken())
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' })
        .expect(201);

      expect(typeof uploadRes.body.uploadUrl).toBe('string');
      expect(uploadRes.body.uploadUrl).toBeTruthy();
      expect(uploadRes.body.key).toMatch(/^market\/listings\//);
    });

    it('POST /:id/images returns 403 for a non-owner', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/listings/${createRes.body.id as string}/images`)
        .set('Authorization', otherMerchantToken())
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' })
        .expect(403);
    });

    it('POST /:id/images returns 401 for unauthenticated request', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', merchantToken())
        .send(BASE_PAYLOAD)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/listings/${createRes.body.id as string}/images`)
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Featured
  // ---------------------------------------------------------------------------

  describe('Featured', () => {
    it('GET /featured returns only active featured listings', async () => {
      await insertActive({ slug: 'feat-regular', titleEn: 'Regular Listing' });
      await insertActive({ isFeatured: true, slug: 'feat-featured', titleEn: 'Featured Listing' });

      const res = await request(app.getHttpServer()).get('/api/v1/listings/featured').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].isFeatured).toBe(true);
      expect(res.body.data[0].titleEn).toBe('Featured Listing');
    });

    it('GET /featured returns empty when no featured listings exist', async () => {
      await insertActive({ slug: 'feat-none', titleEn: 'Not Featured' });

      const res = await request(app.getHttpServer()).get('/api/v1/listings/featured').expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });
});
