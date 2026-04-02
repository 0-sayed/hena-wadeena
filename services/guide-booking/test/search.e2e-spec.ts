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

import { GUIDE_USER_ID, type E2eContext, createE2eApp } from './e2e-helpers';

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
    // Delete in FK-safe order
    await ctx.db.delete(guideReviewHelpfulVotes);
    await ctx.db.delete(guideReviews);
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
        bioAr: 'مرشد سياحي خبير في صحراء غربية',
        bioEn: 'Expert desert tour guide',
        languages: ['ar', 'en'],
        specialties: ['desert', 'history'],
        areasOfOperation: ['kharga', 'dakhla'],
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
        type: 'historical',
        area: 'kharga',
        descriptionAr: 'معبد فرعوني قديم في الخارجة',
        descriptionEn: 'Ancient pharaonic temple in Kharga',
        isActive: true,
        ...overrides,
      })
      .returning();
    return row!;
  }

  async function seedPackage(
    guideId: string,
    overrides: Partial<typeof tourPackages.$inferInsert> = {},
  ) {
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

    it('matches Arabic word prefixes', async () => {
      await seedAttraction({ nameAr: 'معبد هيبس', slug: `prefix-${generateId()}` });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('معب')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title.ar).toContain('معبد');
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
