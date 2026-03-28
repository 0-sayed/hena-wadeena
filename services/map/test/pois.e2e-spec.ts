import { generateId, RedisStreamsService } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { carpoolPassengers } from '../src/db/schema/carpool-passengers';
import { carpoolRides } from '../src/db/schema/carpool-rides';
import { pointsOfInterest } from '../src/db/schema/points-of-interest';

import { RESIDENT_ID, type E2eContext, createE2eApp, createTokenFactory } from './e2e-helpers';

// Set INTERNAL_SECRET for test environment if not already set
process.env.INTERNAL_SECRET ??= 'test-internal-secret';

describe('POI Workflow (e2e)', () => {
  let ctx: E2eContext;
  let tokens: ReturnType<typeof createTokenFactory>;
  let publishSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    ctx = await createE2eApp();
    tokens = createTokenFactory(ctx.jwtService);
    publishSpy = vi
      .spyOn(ctx.app.get(RedisStreamsService), 'publish')
      .mockResolvedValue('mock-stream-id');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    publishSpy.mockClear();
    await ctx.db.delete(carpoolPassengers);
    await ctx.db.delete(carpoolRides);
    await ctx.db.delete(pointsOfInterest);
    await ctx.redis.flushdb();
  });

  // --- Seed helpers ---

  async function seedPoi(
    status: 'pending' | 'approved' | 'rejected' = 'approved',
    overrides: Partial<typeof pointsOfInterest.$inferInsert> = {},
  ) {
    const rows = await ctx.db
      .insert(pointsOfInterest)
      .values({
        id: generateId(),
        nameAr: 'مسجد الوادي',
        nameEn: 'Valley Mosque',
        category: 'religious',
        location: { x: 30.55, y: 25.45 },
        status,
        submittedBy: RESIDENT_ID,
        ...overrides,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('seedPoi failed');
    return row;
  }

  // --- Public Endpoints ---

  describe('GET /api/v1/map/pois (public)', () => {
    it('returns only approved POIs', async () => {
      await seedPoi('approved');
      await seedPoi('pending', { nameAr: 'مكان معلق', submittedBy: RESIDENT_ID });
      await seedPoi('rejected', { nameAr: 'مكان مرفوض', submittedBy: RESIDENT_ID });

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/map/pois').expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].nameAr).toBe('مسجد الوادي');
    });

    it('filters by category', async () => {
      await seedPoi('approved', { category: 'religious' });
      await seedPoi('approved', {
        nameAr: 'حديقة',
        category: 'recreational',
        submittedBy: RESIDENT_ID,
      });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/map/pois?category=religious')
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/map/pois/:id (public)', () => {
    it('returns single approved POI', async () => {
      const poi = await seedPoi('approved');

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/map/pois/${poi.id}`)
        .expect(200);

      expect(res.body.id).toBe(poi.id);
    });

    it('returns 404 for pending POI', async () => {
      const poi = await seedPoi('pending');

      await request(ctx.app.getHttpServer()).get(`/api/v1/map/pois/${poi.id}`).expect(404);
    });
  });

  // --- Submission ---

  describe('POST /api/v1/map/pois', () => {
    it('resident submits POI with pending status', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/map/pois')
        .set('Authorization', tokens.residentToken())
        .send({
          nameAr: 'مكتبة الخارجة',
          nameEn: 'Kharga Library',
          category: 'government',
          location: { lat: 25.44, lng: 30.56 },
        })
        .expect(201);

      expect(res.body.status).toBe('pending');
      expect(res.body.submittedBy).toBe(RESIDENT_ID);
    });

    it('tourist cannot submit POI', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/map/pois')
        .set('Authorization', tokens.touristToken())
        .send({
          nameAr: 'مكان',
          category: 'recreational',
          location: { lat: 25.0, lng: 30.0 },
        })
        .expect(403);
    });

    it('unauthenticated cannot submit POI', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/map/pois')
        .send({
          nameAr: 'مكان',
          category: 'recreational',
          location: { lat: 25.0, lng: 30.0 },
        })
        .expect(401);
    });
  });

  // --- Admin ---

  describe('Admin POI management', () => {
    it('admin approves pending POI and publishes event', async () => {
      const poi = await seedPoi('pending');

      publishSpy.mockClear();
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/map/pois/${poi.id}/approve`)
        .set('Authorization', tokens.adminToken())
        .expect(200);

      expect(publishSpy).toHaveBeenCalledWith(
        'poi.approved',
        expect.objectContaining({ poiId: poi.id }),
      );

      // Verify now visible publicly
      await request(ctx.app.getHttpServer()).get(`/api/v1/map/pois/${poi.id}`).expect(200);
    });

    it('admin rejects pending POI', async () => {
      const poi = await seedPoi('pending');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/map/pois/${poi.id}/reject`)
        .set('Authorization', tokens.adminToken())
        .expect(200);
    });

    it('cannot approve non-pending POI', async () => {
      const poi = await seedPoi('approved');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/map/pois/${poi.id}/approve`)
        .set('Authorization', tokens.adminToken())
        .expect(400);
    });

    it('non-admin cannot approve', async () => {
      const poi = await seedPoi('pending');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/map/pois/${poi.id}/approve`)
        .set('Authorization', tokens.residentToken())
        .expect(403);
    });
  });

  // --- Internal Stats ---

  describe('GET /api/v1/internal/stats', () => {
    it('returns 403 without X-Internal-Secret header', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/internal/stats').expect(403);
    });

    it('returns aggregated stats with valid secret', async () => {
      await seedPoi('approved');
      await seedPoi('pending', { nameAr: 'معلق', submittedBy: RESIDENT_ID });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/stats')
        .set('X-Internal-Secret', process.env.INTERNAL_SECRET!)
        .expect(200);

      expect(res.body.pois.total).toBe(2);
      expect(res.body.pois.approved).toBe(1);
      expect(res.body.pois.pending).toBe(1);
    });
  });
});
