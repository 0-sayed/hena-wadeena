import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { carpoolPassengers } from '../src/db/schema/carpool-passengers';
import { carpoolRides } from '../src/db/schema/carpool-rides';
import { pointsOfInterest } from '../src/db/schema/points-of-interest';

import { RESIDENT_ID, type E2eContext, createE2eApp } from './e2e-helpers';

process.env.INTERNAL_SECRET = 'test-internal-secret';
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
