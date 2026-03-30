import { generateId } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { attractions } from '../src/db/schema/attractions';
import { bookings } from '../src/db/schema/bookings';
import { guideAvailability } from '../src/db/schema/guide-availability';
import { guideReviewHelpfulVotes } from '../src/db/schema/guide-review-helpful-votes';
import { guides } from '../src/db/schema/guides';
import { guideReviews } from '../src/db/schema/reviews';
import { tourPackageAttractions } from '../src/db/schema/tour-package-attractions';
import { tourPackages } from '../src/db/schema/tour-packages';

import { GUIDE_USER_ID, type E2eContext, createE2eApp, createTokenFactory } from './e2e-helpers';

describe('Guide Management (e2e)', () => {
  let ctx: E2eContext;
  let tokens: ReturnType<typeof createTokenFactory>;

  beforeAll(async () => {
    ctx = await createE2eApp();
    tokens = createTokenFactory(ctx.jwtService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await ctx.db.delete(guideReviewHelpfulVotes);
    await ctx.db.delete(guideReviews);
    await ctx.db.delete(tourPackageAttractions);
    await ctx.db.delete(bookings);
    await ctx.db.delete(tourPackages);
    await ctx.db.delete(guideAvailability);
    await ctx.db.delete(guides);
    await ctx.db.delete(attractions);
    await ctx.redis.flushdb();
  });

  // --- Seed helpers ---

  async function seedGuide(overrides: Partial<typeof guides.$inferInsert> = {}) {
    const rows = await ctx.db
      .insert(guides)
      .values({
        id: generateId(),
        userId: GUIDE_USER_ID,
        licenseNumber: `LIC-${generateId().slice(0, 8)}`,
        basePrice: 50000,
        languages: ['arabic', 'english'],
        specialties: ['history', 'nature'],
        areasOfOperation: ['kharga', 'dakhla'],
        licenseVerified: true,
        active: true,
        ...overrides,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('seedGuide failed');
    return row;
  }

  // --- Public Endpoints ---

  describe('GET /api/v1/guides (public)', () => {
    it('returns only verified active guides', async () => {
      await seedGuide({ licenseVerified: true, active: true });
      await seedGuide({
        userId: 'aaaaaaaa-bbbb-cccc-dddd-999999999999',
        licenseNumber: 'LIC-UNVERIFIED',
        licenseVerified: false,
        active: true,
      });

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/guides').expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].licenseVerified).toBe(true);
    });

    it('filters by area', async () => {
      await seedGuide({ areasOfOperation: ['kharga'] });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/guides?area=kharga')
        .expect(200);

      expect(res.body.data.length).toBe(1);

      const empty = await request(ctx.app.getHttpServer())
        .get('/api/v1/guides?area=farafra')
        .expect(200);

      expect(empty.body.data.length).toBe(0);
    });
  });

  describe('GET /api/v1/guides/:id (public)', () => {
    it('returns guide detail', async () => {
      const guide = await seedGuide();

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/guides/${guide.id}`)
        .expect(200);

      expect(res.body.id).toBe(guide.id);
      expect(res.body.languages).toContain('arabic');
    });
  });

  // --- Guide Profile Management ---

  describe('POST /api/v1/my/guide-profile', () => {
    it('guide creates own profile', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/my/guide-profile')
        .set('Authorization', tokens.guideToken())
        .send({
          licenseNumber: 'LIC-NEW-001',
          basePrice: 75000,
          languages: ['arabic'],
          specialties: ['adventure'],
          areasOfOperation: ['farafra'],
        })
        .expect(201);

      expect(res.body.userId).toBe(GUIDE_USER_ID);
      expect(res.body.licenseVerified).toBe(false);
    });

    it('tourist cannot create guide profile', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/my/guide-profile')
        .set('Authorization', tokens.touristToken())
        .send({
          licenseNumber: 'LIC-HACK',
          basePrice: 10000,
        })
        .expect(403);
    });

    it('unauthenticated request returns 401', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/my/guide-profile')
        .send({ licenseNumber: 'LIC-ANON', basePrice: 10000 })
        .expect(401);
    });
  });

  // --- Admin ---

  describe('Admin guide management', () => {
    it('admin verifies guide license', async () => {
      const guide = await seedGuide({ licenseVerified: false });

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/admin/guides/${guide.id}/verify`)
        .set('Authorization', tokens.adminToken())
        .send({ verified: true })
        .expect(200);

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/guides/${guide.id}`)
        .expect(200);

      expect(res.body.licenseVerified).toBe(true);
    });

    it('admin deactivates guide', async () => {
      const guide = await seedGuide({ active: true });

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/admin/guides/${guide.id}/status`)
        .set('Authorization', tokens.adminToken())
        .send({ active: false })
        .expect(200);

      // Deactivated guide must not appear in the public listing
      await request(ctx.app.getHttpServer()).get(`/api/v1/guides/${guide.id}`).expect(404);
    });

    it('tourist cannot access admin endpoints', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/admin/guides')
        .set('Authorization', tokens.touristToken())
        .expect(403);
    });
  });
});
