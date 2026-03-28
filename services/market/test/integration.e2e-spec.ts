// services/market/test/integration.e2e-spec.ts
import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, UserRole } from '@hena-wadeena/types';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { businessCommodities } from '../src/db/schema/business-commodities';
import { businessDirectories } from '../src/db/schema/business-directories';
import { investmentApplications } from '../src/db/schema/investment-applications';
import { investmentOpportunities } from '../src/db/schema/investment-opportunities';
import { listings } from '../src/db/schema/listings';
import { reviewHelpfulVotes } from '../src/db/schema/review-helpful-votes';
import { reviews } from '../src/db/schema/reviews';

import {
  INVESTOR_ID,
  MERCHANT_ID,
  RESIDENT_ID,
  TOURIST_ID,
  createE2eApp,
  createTokenFactory,
  type E2eContext,
} from './e2e-helpers';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let ctx: E2eContext;
let tokens: ReturnType<typeof createTokenFactory>;

const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'dev-internal-secret';

beforeAll(async () => {
  ctx = await createE2eApp();
  tokens = createTokenFactory(ctx.jwtService);
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await ctx.db.delete(reviewHelpfulVotes);
  await ctx.db.delete(reviews);
  await ctx.db.delete(investmentApplications);
  await ctx.db.delete(investmentOpportunities);
  await ctx.db.delete(listings);
  await ctx.db.delete(businessCommodities);
  await ctx.db.delete(businessDirectories);
  await ctx.redis.flushdb();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedOpportunity(ownerId = MERCHANT_ID, status = 'active' as const) {
  const [opp] = await ctx.db
    .insert(investmentOpportunities)
    .values({
      ownerId,
      titleAr: 'مشروع اختباري',
      titleEn: 'Test Project',
      description: 'Test opportunity for integration',
      sector: 'agriculture',
      area: 'Al Kharga',
      minInvestment: 100000,
      maxInvestment: 500000,
      currency: 'EGP',
      status,
    })
    .returning();
  return opp!;
}

async function seedListing(ownerId = MERCHANT_ID) {
  const [listing] = await ctx.db
    .insert(listings)
    .values({
      ownerId,
      titleAr: 'شقة اختبارية',
      titleEn: 'Test Apartment',
      slug: `test-listing-${Date.now()}`,
      category: 'accommodation',
      listingType: 'real_estate',
      transaction: 'rent',
      price: 50000,
      status: 'active',
    })
    .returning();
  return listing!;
}

// ---------------------------------------------------------------------------
// 1. KYC Gating
// ---------------------------------------------------------------------------

describe('KYC Gating — Investment Detail', () => {
  it('approved investor can view investment detail', async () => {
    const opp = await seedOpportunity();

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/investments/${opp.id}`)
      .set('Authorization', tokens.investorToken({ kycStatus: 'approved' }))
      .expect(200);

    expect(res.body.id).toBe(opp.id);
  });

  it('pending KYC investor is rejected from investment detail', async () => {
    const opp = await seedOpportunity();

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/investments/${opp.id}`)
      .set('Authorization', tokens.investorToken({ kycStatus: 'pending' }))
      .expect(403);

    expect(res.body.message).toContain('KYC');
  });

  it('investor without any KYC is rejected', async () => {
    const opp = await seedOpportunity();

    // investorToken with no kycStatus
    const token = tokens.makeToken(INVESTOR_ID, UserRole.INVESTOR);

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/investments/${opp.id}`)
      .set('Authorization', token)
      .expect(403);

    expect(res.body.message).toContain('KYC');
  });

  it('admin bypasses KYC check', async () => {
    const opp = await seedOpportunity();

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/investments/${opp.id}`)
      .set('Authorization', tokens.adminToken())
      .expect(200);

    expect(res.body.id).toBe(opp.id);
  });
});

// ---------------------------------------------------------------------------
// 2. Role Guards
// ---------------------------------------------------------------------------

describe('Role Guards — Listing Creation', () => {
  it('tourist cannot create listing', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', tokens.touristToken())
      .send({
        titleAr: 'اختبار',
        titleEn: 'Test',
        price: 10000,
        category: 'accommodation',
        listingType: 'real_estate',
        transaction: 'rent',
      })
      .expect(403);
  });

  it('merchant can create listing', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', tokens.merchantToken())
      .send({
        titleAr: 'شقة جديدة',
        titleEn: 'New Apartment',
        price: 50000,
        category: 'accommodation',
        listingType: 'real_estate',
        transaction: 'rent',
      })
      .expect(201);

    expect(res.body.ownerId).toBe(MERCHANT_ID);
  });

  it('resident can create listing', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', tokens.residentToken())
      .send({
        titleAr: 'عقار للبيع',
        titleEn: 'Property for Sale',
        price: 100000,
        category: 'accommodation',
        listingType: 'real_estate',
        transaction: 'sale',
      })
      .expect(201);

    expect(res.body.ownerId).toBe(RESIDENT_ID);
  });
});

describe('Role Guards — Investment Detail Access', () => {
  it('unauthenticated request gets 401', async () => {
    const opp = await seedOpportunity();

    await request(ctx.app.getHttpServer()).get(`/api/v1/investments/${opp.id}`).expect(401);
  });

  it('verified investor can view investment detail', async () => {
    const opp = await seedOpportunity();

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/investments/${opp.id}`)
      .set('Authorization', tokens.investorToken({ kycStatus: 'approved' }))
      .expect(200);

    expect(res.body.id).toBe(opp.id);
  });
});

// ---------------------------------------------------------------------------
// 3. Ownership
// ---------------------------------------------------------------------------

describe('Ownership — Listing Updates', () => {
  it('owner can update their listing', async () => {
    const listing = await seedListing(MERCHANT_ID);

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/listings/${listing.id}`)
      .set('Authorization', tokens.merchantToken())
      .send({ titleEn: 'Updated Title' })
      .expect(200);
  });

  it('non-owner cannot update listing', async () => {
    const listing = await seedListing(MERCHANT_ID);

    // INVESTOR_ID is not the owner
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/listings/${listing.id}`)
      .set('Authorization', tokens.investorToken({ kycStatus: 'approved' }))
      .expect(403);
  });

  it('admin can update any listing', async () => {
    const listing = await seedListing(MERCHANT_ID);

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/listings/${listing.id}`)
      .set('Authorization', tokens.adminToken())
      .send({ titleEn: 'Admin Updated' })
      .expect(200);
  });
});

// ---------------------------------------------------------------------------
// 4. Event Payloads
// ---------------------------------------------------------------------------

describe('Event Payloads', () => {
  it('LISTING_CREATED contains all required fields', async () => {
    const streamsService = ctx.app.get(RedisStreamsService);
    const publishSpy = vi.spyOn(streamsService, 'publish');

    await request(ctx.app.getHttpServer())
      .post('/api/v1/listings')
      .set('Authorization', tokens.merchantToken())
      .send({
        titleAr: 'فندق جديد',
        titleEn: 'New Hotel',
        price: 200000,
        category: 'accommodation',
        listingType: 'real_estate',
        transaction: 'sale',
      })
      .expect(201);

    // Wait for fire-and-forget publish
    await new Promise((r) => setTimeout(r, 100));

    const call = publishSpy.mock.calls.find(([event]) => event === EVENTS.LISTING_CREATED);
    expect(call).toBeDefined();

    const payload = call![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('listingId');
    expect(payload).toHaveProperty('titleAr', 'فندق جديد');
    expect(payload).toHaveProperty('titleEn', 'New Hotel');
    expect(payload).toHaveProperty('category', 'accommodation');
    expect(payload).toHaveProperty('ownerId', MERCHANT_ID);
    expect(payload).toHaveProperty('status', 'draft');
    expect(payload).toHaveProperty('createdAt');

    publishSpy.mockRestore();
  });

  it('REVIEW_SUBMITTED contains listingOwnerId and reviewerId', async () => {
    const listing = await seedListing(MERCHANT_ID);
    const streamsService = ctx.app.get(RedisStreamsService);
    const publishSpy = vi.spyOn(streamsService, 'publish');

    await request(ctx.app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', tokens.touristToken())
      .send({
        listingId: listing.id,
        rating: 5,
        title: 'Amazing',
        comment: 'Excellent place',
      })
      .expect(201);

    await new Promise((r) => setTimeout(r, 100));

    const call = publishSpy.mock.calls.find(([event]) => event === EVENTS.REVIEW_SUBMITTED);
    expect(call).toBeDefined();

    const payload = call![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('reviewerId', TOURIST_ID);
    expect(payload).toHaveProperty('listingOwnerId', MERCHANT_ID);
    expect(payload).toHaveProperty('targetType', 'listing');
    expect(payload).toHaveProperty('targetId', listing.id);
    expect(payload).toHaveProperty('rating', 5);
    expect(payload).toHaveProperty('createdAt');

    publishSpy.mockRestore();
  });

  it('OPPORTUNITY_PUBLISHED contains titles and description', async () => {
    const opp = await seedOpportunity(MERCHANT_ID, 'review');
    const streamsService = ctx.app.get(RedisStreamsService);
    const publishSpy = vi.spyOn(streamsService, 'publish');

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/admin/investments/${opp.id}/approve`)
      .set('Authorization', tokens.adminToken())
      .expect(200);

    await new Promise((r) => setTimeout(r, 100));

    const call = publishSpy.mock.calls.find(([event]) => event === EVENTS.OPPORTUNITY_PUBLISHED);
    expect(call).toBeDefined();

    const payload = call![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('opportunityId', opp.id);
    expect(payload).toHaveProperty('ownerId', MERCHANT_ID);
    expect(payload).toHaveProperty('titleAr', 'مشروع اختباري');
    expect(payload).toHaveProperty('titleEn', 'Test Project');
    expect(payload).toHaveProperty('sector', 'agriculture');
    expect(payload).toHaveProperty('createdAt');

    publishSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 5. Internal Search Contract
// ---------------------------------------------------------------------------

describe('Internal Search Contract', () => {
  it('returns correct response shape', async () => {
    await seedListing();

    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/internal/search?q=اختبار')
      .set('X-Internal-Secret', INTERNAL_SECRET)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('hasMore');
    expect(res.body).toHaveProperty('query');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('each result has required fields', async () => {
    await seedListing();

    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/internal/search?q=اختبار')
      .set('X-Internal-Secret', INTERNAL_SECRET)
      .expect(200);

    if (res.body.data.length > 0) {
      const result = res.body.data[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result.title).toHaveProperty('ar');
      expect(result).toHaveProperty('snippet');
      expect(result).toHaveProperty('rank');
      expect(result).toHaveProperty('metadata');
    }
  });

  it('rejects requests without internal secret header', async () => {
    await request(ctx.app.getHttpServer()).get('/api/v1/internal/search?q=test').expect(403);
  });
});
