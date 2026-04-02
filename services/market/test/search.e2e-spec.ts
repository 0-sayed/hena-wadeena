import { generateId } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { businessCommodities } from '../src/db/schema/business-commodities';
import { businessDirectories } from '../src/db/schema/business-directories';
import { investmentApplications } from '../src/db/schema/investment-applications';
import { investmentOpportunities } from '../src/db/schema/investment-opportunities';
import { listings } from '../src/db/schema/listings';
import { reviewHelpfulVotes } from '../src/db/schema/review-helpful-votes';
import { reviews } from '../src/db/schema/reviews';

import { MERCHANT_ID, type E2eContext, createE2eApp } from './e2e-helpers';

// Set INTERNAL_SECRET for test environment if not already set
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
    await ctx.db.delete(reviewHelpfulVotes);
    await ctx.db.delete(reviews);
    await ctx.db.delete(listings);
    await ctx.db.delete(investmentApplications);
    await ctx.db.delete(investmentOpportunities);
    await ctx.db.delete(businessCommodities);
    await ctx.db.delete(businessDirectories);
    await ctx.redis.flushdb();
  });

  // --- Seed helpers ---

  async function seedListing(overrides: Partial<typeof listings.$inferInsert> = {}) {
    const [row] = await ctx.db
      .insert(listings)
      .values({
        ownerId: MERCHANT_ID,
        titleAr: 'فندق الصحراء الكبير',
        titleEn: 'Grand Desert Hotel',
        description: 'فندق فاخر في قلب الوادي الجديد',
        listingType: 'business',
        transaction: 'rent',
        category: 'accommodation',
        price: 500000,
        slug: `listing-${generateId()}`,
        status: 'active',
        isPublished: true,
        ...overrides,
      })
      .returning();
    return row!;
  }

  async function seedOpportunity(
    overrides: Partial<typeof investmentOpportunities.$inferInsert> = {},
  ) {
    const [row] = await ctx.db
      .insert(investmentOpportunities)
      .values({
        ownerId: MERCHANT_ID,
        titleAr: 'فرصة استثمارية في الزراعة',
        titleEn: 'Agricultural Investment Opportunity',
        description: 'مشروع زراعي في الوادي الجديد',
        sector: 'agriculture',
        minInvestment: 100000,
        maxInvestment: 500000,
        status: 'active',
        ...overrides,
      })
      .returning();
    return row!;
  }

  async function seedBusiness(overrides: Partial<typeof businessDirectories.$inferInsert> = {}) {
    const [row] = await ctx.db
      .insert(businessDirectories)
      .values({
        ownerId: MERCHANT_ID,
        nameAr: 'مطعم الواحة',
        nameEn: 'Oasis Restaurant',
        category: 'restaurant',
        description: 'مطعم تقليدي في الخارجة',
        status: 'active',
        verificationStatus: 'verified',
        ...overrides,
      })
      .returning();
    return row!;
  }

  // --- Tests ---

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

    it('finds listing by Arabic title', async () => {
      await seedListing();

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=فندق')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].type).toBe('listing');
      expect(res.body.data[0].title.ar).toContain('فندق');
    });

    it('finds listing by English title', async () => {
      await seedListing();

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=hotel')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title.en).toContain('Hotel');
    });

    it('matches Arabic query with tashkeel (diacritics stripped)', async () => {
      await seedListing({
        titleAr: 'فندق',
        description: 'فندق فاخر',
        slug: `tashkeel-${generateId()}`,
      });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('فُنْدُق')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('matches Arabic word prefixes', async () => {
      await seedListing({
        titleAr: 'فندق الصحراء الكبير',
        description: 'فندق فاخر',
        slug: `prefix-${generateId()}`,
      });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=فن')
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title.ar).toContain('فندق');
    });

    it('normalizes alef variants in search', async () => {
      await seedListing({ titleAr: 'اكل', description: 'طعام لذيذ', slug: `alef-${generateId()}` });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('أكل')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('ranks title match higher than description-only match', async () => {
      await seedListing({
        titleAr: 'فندق النجوم',
        description: 'مكان رائع',
        slug: `title-match-${generateId()}`,
      });
      await seedListing({
        titleAr: 'مكان رائع',
        description: 'هذا فندق جميل',
        slug: `desc-match-${generateId()}`,
      });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('فندق')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].title.ar).toContain('فندق');
    });

    it('returns results from all entity types', async () => {
      await seedListing({ titleAr: 'الوادي الجديد فندق', slug: `cross-${generateId()}` });
      await seedOpportunity({ titleAr: 'الوادي الجديد استثمار' });
      await seedBusiness({ nameAr: 'الوادي الجديد مطعم' });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('الوادي')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      const types = (res.body.data as { type: string }[]).map((r) => r.type);
      expect(types).toContain('listing');
      expect(types).toContain('opportunity');
      expect(types).toContain('business');
    });

    it('excludes draft and suspended listings', async () => {
      await seedListing({ status: 'draft', slug: `draft-${generateId()}` });
      await seedListing({ status: 'suspended', slug: `susp-${generateId()}` });

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('فندق')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('paginates results', async () => {
      // Seed 4 listings so each page gets 2 full-text hits, avoiding fuzzy fallback contamination
      for (let i = 0; i < 4; i++) {
        await seedListing({
          titleAr: `فندق ${i}`,
          slug: `page-${i}-${generateId()}`,
        });
      }

      const page1 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('فندق')}&limit=2&offset=0`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(page1.body.data.length).toBe(2);

      const page2 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/internal/search?q=${encodeURIComponent('فندق')}&limit=2&offset=2`)
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
        .get(`/api/v1/internal/search?q=${encodeURIComponent('zzzzzzzznotfound')}`)
        .set('X-Internal-Secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });
  });
});
