import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { businessCommodities } from '../src/db/schema/business-commodities';
import { businessDirectories } from '../src/db/schema/business-directories';
import { commodities } from '../src/db/schema/commodities';

import { MERCHANT_ID, type E2eContext, createE2eApp, createTokenFactory } from './e2e-helpers';

const BASE_BUSINESS = {
  nameAr: 'تجارة التمور',
  nameEn: 'Date Trading Co.',
  category: 'trade',
  district: 'kharga',
};

describe('Business Directory (e2e)', () => {
  let ctx: E2eContext;
  let adminToken: () => string;
  let merchantToken: () => string;
  let investorToken: () => string;
  let touristToken: () => string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    const tokens = createTokenFactory(ctx.jwtService);
    adminToken = tokens.adminToken;
    merchantToken = tokens.merchantToken;
    investorToken = tokens.investorToken;
    touristToken = tokens.touristToken;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    // Delete in FK-safe order
    await ctx.db.delete(businessCommodities);
    await ctx.db.delete(businessDirectories);
    await ctx.db.delete(commodities);
    // Flush Redis — ioredis keyPrefix causes double-prefix on KEYS+DEL; flushdb bypasses this
    await ctx.redis.flushdb();
  });

  // ---------------------------------------------------------------------------
  // Business Creation
  // ---------------------------------------------------------------------------

  describe('Business Creation', () => {
    it('merchant creates business → 201, verificationStatus=pending', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.nameAr).toBe(BASE_BUSINESS.nameAr);
      expect(res.body.nameEn).toBe(BASE_BUSINESS.nameEn);
      expect(res.body.verificationStatus).toBe('pending');
      expect(res.body.ownerId).toBe(MERCHANT_ID);
    });

    it('investor creates business → 201, verificationStatus=pending', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', investorToken())
        .send(BASE_BUSINESS)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.verificationStatus).toBe('pending');
    });

    it('tourist creates business → 403', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', touristToken())
        .send(BASE_BUSINESS)
        .expect(403);
    });

    it('merchant creates business with commodity links → commodities stored', async () => {
      // Create a commodity first
      const commRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/commodities')
        .set('Authorization', adminToken())
        .send({ nameAr: 'تمور', nameEn: 'Dates', category: 'fruits', unit: 'kg' })
        .expect(201);

      const commodityId = commRes.body.id as string;

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send({ ...BASE_BUSINESS, commodityIds: [commodityId] })
        .expect(201);

      const businessId = res.body.id as string;

      // Verify GET /:id includes the commodity
      const detail = await request(ctx.app.getHttpServer())
        .get(`/api/v1/businesses/${businessId}`)
        .expect(200);

      expect(Array.isArray(detail.body.commodities)).toBe(true);
      expect(detail.body.commodities).toHaveLength(1);
      expect(detail.body.commodities[0].id).toBe(commodityId);
    });
  });

  // ---------------------------------------------------------------------------
  // Public Listing — findAll
  // ---------------------------------------------------------------------------

  describe('Public Listing', () => {
    it('GET /businesses does NOT include pending businesses', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/businesses').expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('admin verifies → business appears in public list', async () => {
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      const businessId = createRes.body.id as string;

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'verified' })
        .expect(200);

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/businesses').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(businessId);
      expect(res.body.data[0].verificationStatus).toBe('verified');
    });

    it('GET /businesses returns PaginatedResponse shape', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/businesses?offset=0&limit=10')
        .expect(200);

      expect(typeof res.body.total).toBe('number');
      expect(typeof res.body.page).toBe('number');
      expect(typeof res.body.limit).toBe('number');
      expect(typeof res.body.hasMore).toBe('boolean');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /businesses?commodity_id filters correctly', async () => {
      const commRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/commodities')
        .set('Authorization', adminToken())
        .send({ nameAr: 'تمور', nameEn: 'Dates', category: 'fruits', unit: 'kg' })
        .expect(201);

      const commodityId = commRes.body.id as string;

      // Create and verify a business linked to this commodity
      const bizRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send({ ...BASE_BUSINESS, commodityIds: [commodityId] })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${bizRes.body.id}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'verified' })
        .expect(200);

      // Create another business without the commodity and verify it
      const bizRes2 = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send({ ...BASE_BUSINESS, nameAr: 'تجارة أخرى', nameEn: 'Other Trade' })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${bizRes2.body.id}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'verified' })
        .expect(200);

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/businesses?commodity_id=${commodityId}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(bizRes.body.id);
    });

    it('GET /businesses?q=search uses ILIKE on nameEn', async () => {
      const bizRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send({ ...BASE_BUSINESS, nameEn: 'Unique Trading Store' })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${bizRes.body.id}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'verified' })
        .expect(200);

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/businesses?q=Unique')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].nameEn).toBe('Unique Trading Store');
    });

    it('GET /businesses?q=partial query matches incomplete Arabic text', async () => {
      const bizRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send({ ...BASE_BUSINESS, nameAr: 'متجر الفرافرة للتمور' })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${bizRes.body.id}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'verified' })
        .expect(200);

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/businesses?q=${encodeURIComponent('الفرا')}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].nameAr).toBe('متجر الفرافرة للتمور');
    });
  });

  // ---------------------------------------------------------------------------
  // Verification Flow
  // ---------------------------------------------------------------------------

  describe('Verification Flow', () => {
    let businessId: string;

    beforeEach(async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);
      businessId = res.body.id as string;
    });

    it('admin rejects → 200, rejectionReason persisted', async () => {
      const reason = 'Incomplete documentation';

      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'rejected', rejectionReason: reason })
        .expect(200);

      expect(res.body.verificationStatus).toBe('rejected');
      expect(res.body.rejectionReason).toBe(reason);
    });

    it('reject without rejectionReason → 400', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'rejected' })
        .expect(400);
    });

    it('owner PATCHes rejected business (re-verification field) → resets to pending', async () => {
      // Reject first
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'rejected', rejectionReason: 'Incomplete docs' })
        .expect(200);

      // Owner updates a re-verification field → should reset to pending
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}`)
        .set('Authorization', merchantToken())
        .send({ nameAr: 'تجارة التمور المحدّثة' })
        .expect(200);

      expect(res.body.verificationStatus).toBe('pending');
      expect(res.body.rejectionReason).toBeNull();
    });

    it('owner PATCHes contact-only field → does NOT reset verification', async () => {
      // Verify first
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}/verify`)
        .set('Authorization', adminToken())
        .send({ status: 'verified' })
        .expect(200);

      // Update phone only (contact-only, not re-verification field)
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}`)
        .set('Authorization', merchantToken())
        .send({ phone: '+20123456789' })
        .expect(200);

      expect(res.body.verificationStatus).toBe('verified');
    });

    it('non-owner PATCH → 403', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/businesses/${businessId}`)
        .set('Authorization', investorToken())
        .send({ phone: '+20111111111' })
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Mine & Soft Delete
  // ---------------------------------------------------------------------------

  describe('Mine & Soft Delete', () => {
    it('GET /businesses/mine returns all own entries (including pending)', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send({ ...BASE_BUSINESS, nameAr: 'أخرى' })
        .expect(201);

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/businesses/mine')
        .set('Authorization', merchantToken())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((b: { ownerId: string }) => b.ownerId === MERCHANT_ID)).toBe(true);
    });

    it('GET /businesses/mine requires auth', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/businesses/mine').expect(401);
    });

    it('owner DELETE → soft delete → GET /:id returns 404', async () => {
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      const businessId = createRes.body.id as string;

      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/businesses/${businessId}`)
        .set('Authorization', merchantToken())
        .expect(200);

      await request(ctx.app.getHttpServer()).get(`/api/v1/businesses/${businessId}`).expect(404);
    });

    it('non-owner DELETE → 403', async () => {
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      const businessId = createRes.body.id as string;

      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/businesses/${businessId}`)
        .set('Authorization', investorToken())
        .expect(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Admin Pending Queue
  // ---------------------------------------------------------------------------

  describe('Admin Pending Queue', () => {
    it('GET /businesses/pending returns pending businesses (admin only)', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/businesses')
        .set('Authorization', merchantToken())
        .send(BASE_BUSINESS)
        .expect(201);

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/businesses/pending')
        .set('Authorization', adminToken())
        .expect(200);

      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].verificationStatus).toBe('pending');
    });

    it('GET /businesses/pending requires admin', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/businesses/pending')
        .set('Authorization', merchantToken())
        .expect(403);
    });
  });
});
