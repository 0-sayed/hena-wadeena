import { generateId, RedisStreamsService } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { attractions } from '../src/db/schema/attractions';
import { bookings } from '../src/db/schema/bookings';
import { guideAvailability } from '../src/db/schema/guide-availability';
import { guideReviewHelpfulVotes } from '../src/db/schema/guide-review-helpful-votes';
import { guides } from '../src/db/schema/guides';
import { guideReviews } from '../src/db/schema/reviews';
import { tourPackageAttractions } from '../src/db/schema/tour-package-attractions';
import { tourPackages } from '../src/db/schema/tour-packages';

import {
  GUIDE_USER_ID,
  TOURIST_ID,
  type E2eContext,
  createE2eApp,
  createTokenFactory,
} from './e2e-helpers';

describe('Reviews (e2e)', () => {
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

  async function seedCompletedBooking(touristId: string = TOURIST_ID) {
    const [guide] = await ctx.db
      .insert(guides)
      .values({
        id: generateId(),
        userId: GUIDE_USER_ID,
        licenseNumber: `LIC-${generateId().slice(0, 8)}`,
        basePrice: 50000,
        languages: ['arabic'],
        specialties: ['history'],
        areasOfOperation: ['kharga'],
        licenseVerified: true,
        active: true,
      })
      .returning();

    const [pkg] = await ctx.db
      .insert(tourPackages)
      .values({
        id: generateId(),
        guideId: guide!.id,
        titleAr: 'جولة',
        durationHours: 3,
        maxPeople: 5,
        price: 100000,
        status: 'active',
      })
      .returning();

    const [booking] = await ctx.db
      .insert(bookings)
      .values({
        id: generateId(),
        packageId: pkg!.id,
        guideId: guide!.id,
        touristId,
        bookingDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 100000,
        status: 'completed',
      })
      .returning();

    return { guide: guide!, pkg: pkg!, booking: booking! };
  }

  // --- Tests ---

  describe('POST /api/v1/reviews', () => {
    it('creates review for completed booking', async () => {
      const { booking } = await seedCompletedBooking();

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', tokens.touristToken())
        .send({
          bookingId: booking.id,
          rating: 4,
          comment: 'Great tour experience',
        })
        .expect(201);

      expect(res.body.rating).toBe(4);
    });

    it('rejects review from non-tourist of the booking', async () => {
      const { booking } = await seedCompletedBooking();

      await request(ctx.app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', tokens.tourist2Token())
        .send({
          bookingId: booking.id,
          rating: 5,
          comment: 'Fake review',
        })
        .expect(403);
    });

    it('rejects duplicate review for same booking', async () => {
      const { booking } = await seedCompletedBooking();

      await request(ctx.app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', tokens.touristToken())
        .send({ bookingId: booking.id, rating: 5, comment: 'First review' })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', tokens.touristToken())
        .send({ bookingId: booking.id, rating: 3, comment: 'Duplicate' })
        .expect(409);
    });
  });

  describe('Guide reply', () => {
    it('guide replies to a review', async () => {
      const { booking } = await seedCompletedBooking();

      const reviewRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', tokens.touristToken())
        .send({ bookingId: booking.id, rating: 4, comment: 'Nice tour' })
        .expect(201);

      const replyRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/reviews/${reviewRes.body.id}/reply`)
        .set('Authorization', tokens.guideToken())
        .send({ guideReply: 'Thank you for the kind words!' })
        .expect(201);

      expect(replyRes.body.guideReply).toBe('Thank you for the kind words!');
    });
  });

  describe('Helpful votes', () => {
    it('marks review as helpful and rejects duplicate vote', async () => {
      const { booking } = await seedCompletedBooking();

      const reviewRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', tokens.touristToken())
        .send({ bookingId: booking.id, rating: 5, comment: 'Amazing!' })
        .expect(201);

      // Vote helpful
      const vote1 = await request(ctx.app.getHttpServer())
        .post(`/api/v1/reviews/${reviewRes.body.id}/helpful`)
        .set('Authorization', tokens.guideToken())
        .expect(201);

      expect(vote1.body.helpfulCount).toBe(1);

      // Duplicate vote is rejected
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/reviews/${reviewRes.body.id}/helpful`)
        .set('Authorization', tokens.guideToken())
        .expect(409);
    });
  });
});
