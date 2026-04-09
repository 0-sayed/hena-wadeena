import { RedisStreamsService, generateId } from '@hena-wadeena/nest-common';
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

// Set INTERNAL_SECRET for test environment if not already set
process.env.INTERNAL_SECRET ??= 'test-internal-secret';

describe('Booking Lifecycle (e2e)', () => {
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
    // Delete in FK-safe order
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

  async function seedPackage(guideId: string) {
    const rows = await ctx.db
      .insert(tourPackages)
      .values({
        id: generateId(),
        guideId,
        titleAr: 'جولة الواحات',
        titleEn: 'Oasis Tour',
        durationHours: 4,
        maxPeople: 10,
        price: 200000,
        status: 'active',
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('seedPackage failed');
    return row;
  }

  /** Returns today's date in Cairo timezone as YYYY-MM-DD */
  function todayDate(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  }

  /** Returns tomorrow's date in Cairo timezone as YYYY-MM-DD (for API creation: must be future) */
  function tomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  }

  // --- Happy Path ---

  describe('Full booking lifecycle', () => {
    it('tourist creates a booking via API', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);

      // Booking date must be in the future to pass API validation
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', tokens.touristToken())
        .send({
          packageId: pkg.id,
          bookingDate: tomorrowDate(),
          startTime: '09:00',
          peopleCount: 2,
          notes: 'Looking forward to the tour',
        })
        .expect(201);

      expect(createRes.body.status).toBe('pending');
      expect(createRes.body.totalPrice).toBe(400000); // 200000 * 2 people
      expect(publishSpy).toHaveBeenCalledWith(
        'booking.requested',
        expect.objectContaining({
          bookingId: createRes.body.id,
          touristUserId: TOURIST_ID,
          guideUserId: GUIDE_USER_ID,
          guideProfileId: guide.id,
          packageId: pkg.id,
          packageTitleAr: 'جولة الواحات',
          packageTitleEn: 'Oasis Tour',
          totalPrice: '400000',
        }),
      );
    });

    it('rejects a duplicate active slot for the same guide/date/start time', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const bookingDate = tomorrowDate();

      await ctx.db.insert(bookings).values({
        id: generateId(),
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate,
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 200000,
        status: 'pending',
      });

      await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', tokens.tourist2Token())
        .send({
          packageId: pkg.id,
          bookingDate,
          startTime: '09:00',
          peopleCount: 2,
        })
        .expect(409);
    });

    it('allows rebooking a slot after cancellation', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const bookingDate = tomorrowDate();

      await ctx.db.insert(bookings).values({
        id: generateId(),
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate,
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 200000,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Initial customer cancelled',
      });

      await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', tokens.tourist2Token())
        .send({
          packageId: pkg.id,
          bookingDate,
          startTime: '09:00',
          peopleCount: 2,
        })
        .expect(201);
    });

    it('allows rebooking a slot after completion', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const bookingDate = tomorrowDate();

      await ctx.db.insert(bookings).values({
        id: generateId(),
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate,
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 200000,
        status: 'completed',
      });

      await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', tokens.tourist2Token())
        .send({
          packageId: pkg.id,
          bookingDate,
          startTime: '09:00',
          peopleCount: 2,
        })
        .expect(201);
    });

    it('guide confirms → starts → completes a booking', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);

      // Seed pending booking with today's date so start is allowed
      const bookingId = generateId();
      await ctx.db.insert(bookings).values({
        id: bookingId,
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate: todayDate(),
        startTime: '09:00',
        peopleCount: 2,
        totalPrice: 200000,
        status: 'pending',
      });

      // Guide confirms
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/confirm`)
        .set('Authorization', tokens.guideToken())
        .expect(200);

      const confirmed = await request(ctx.app.getHttpServer())
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', tokens.guideToken())
        .expect(200);
      expect(confirmed.body.status).toBe('confirmed');
      expect(publishSpy).toHaveBeenCalledWith(
        'booking.confirmed',
        expect.objectContaining({
          bookingId,
          touristUserId: TOURIST_ID,
          guideUserId: GUIDE_USER_ID,
          guideProfileId: guide.id,
          packageId: pkg.id,
          packageTitleAr: 'جولة الواحات',
          packageTitleEn: 'Oasis Tour',
          totalPrice: '200000',
        }),
      );

      // Guide starts (booking date = today)
      publishSpy.mockClear();
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/start`)
        .set('Authorization', tokens.guideToken())
        .expect(200);

      const started = await request(ctx.app.getHttpServer())
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', tokens.guideToken())
        .expect(200);
      expect(started.body.status).toBe('in_progress');

      // Guide completes
      publishSpy.mockClear();
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/complete`)
        .set('Authorization', tokens.guideToken())
        .expect(200);

      const completed = await request(ctx.app.getHttpServer())
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', tokens.guideToken())
        .expect(200);
      expect(completed.body.status).toBe('completed');
      expect(publishSpy).toHaveBeenCalledWith(
        'booking.completed',
        expect.objectContaining({
          bookingId,
          touristUserId: TOURIST_ID,
          guideUserId: GUIDE_USER_ID,
          guideProfileId: guide.id,
          packageId: pkg.id,
          packageTitleAr: 'جولة الواحات',
          packageTitleEn: 'Oasis Tour',
          totalPrice: '200000',
        }),
      );
    });

    it('tourist submits review after completed booking', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      // Seed a completed booking directly
      const rows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 2,
          totalPrice: 200000,
          status: 'completed',
        })
        .returning();
      const booking = rows[0];
      if (!booking) throw new Error('seed failed');

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/guide-reviews')
        .set('Authorization', tokens.touristToken())
        .send({
          bookingId: booking.id,
          rating: 5,
          comment: 'Excellent tour, highly recommend!',
        })
        .expect(201);

      expect(res.body.rating).toBe(5);
      expect(publishSpy).toHaveBeenCalledWith(
        'review.submitted',
        expect.objectContaining({ targetType: 'guide', rating: '5' }),
      );
    });
  });

  // --- Error Cases ---

  describe('Authorization errors', () => {
    it('tourist cannot confirm a booking', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const rows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 1,
          totalPrice: 200000,
          status: 'pending',
        })
        .returning();
      const booking = rows[0];
      if (!booking) throw new Error('seed failed');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${booking.id}/confirm`)
        .set('Authorization', tokens.touristToken())
        .expect(403);
    });

    it('tourist cannot start or complete a booking', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);

      // Confirmed booking for start test
      const confirmedRows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 1,
          totalPrice: 200000,
          status: 'confirmed',
        })
        .returning();
      const confirmed = confirmedRows[0];
      if (!confirmed) throw new Error('seed failed');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${confirmed.id}/start`)
        .set('Authorization', tokens.touristToken())
        .expect(403);

      // In-progress booking for complete test (auth check requires in_progress to reach it)
      const inProgressRows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 1,
          totalPrice: 200000,
          status: 'in_progress',
        })
        .returning();
      const inProgress = inProgressRows[0];
      if (!inProgress) throw new Error('seed failed');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${inProgress.id}/complete`)
        .set('Authorization', tokens.touristToken())
        .expect(403);
    });
  });

  describe('State machine errors', () => {
    it('cannot skip from pending to completed', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const rows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 1,
          totalPrice: 200000,
          status: 'pending',
        })
        .returning();
      const booking = rows[0];
      if (!booking) throw new Error('seed failed');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${booking.id}/complete`)
        .set('Authorization', tokens.guideToken())
        .expect(400);
    });
  });

  describe('Validation errors', () => {
    it('cannot book with unverified guide', async () => {
      const guide = await seedGuide({ licenseVerified: false });
      const pkg = await seedPackage(guide.id);

      await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', tokens.touristToken())
        .send({
          packageId: pkg.id,
          bookingDate: tomorrowDate(),
          startTime: '09:00',
          peopleCount: 1,
        })
        .expect(400);
    });

    it('cannot book with inactive guide', async () => {
      const guide = await seedGuide({ active: false });
      const pkg = await seedPackage(guide.id);

      await request(ctx.app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', tokens.touristToken())
        .send({
          packageId: pkg.id,
          bookingDate: tomorrowDate(),
          startTime: '09:00',
          peopleCount: 1,
        })
        .expect(400);
    });
  });

  describe('Cancellation flows', () => {
    it('tourist can cancel a pending booking', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const rows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 1,
          totalPrice: 200000,
          status: 'pending',
        })
        .returning();
      const booking = rows[0];
      if (!booking) throw new Error('seed failed');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${booking.id}/cancel`)
        .set('Authorization', tokens.touristToken())
        .send({ cancelReason: 'Change of plans' })
        .expect(200);

      expect(publishSpy).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({
          bookingId: booking.id,
          touristUserId: TOURIST_ID,
          guideUserId: GUIDE_USER_ID,
          guideProfileId: guide.id,
          packageId: pkg.id,
          packageTitleAr: 'جولة الواحات',
          packageTitleEn: 'Oasis Tour',
          totalPrice: '200000',
          cancellationReason: 'Change of plans',
          cancelledByRole: 'tourist',
          cancelledByUserId: TOURIST_ID,
        }),
      );
    });

    it('tourist cannot cancel an in_progress booking', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      const rows = await ctx.db
        .insert(bookings)
        .values({
          id: generateId(),
          packageId: pkg.id,
          guideId: guide.id,
          touristId: TOURIST_ID,
          bookingDate: todayDate(),
          startTime: '09:00',
          peopleCount: 1,
          totalPrice: 200000,
          status: 'in_progress',
        })
        .returning();
      const booking = rows[0];
      if (!booking) throw new Error('seed failed');

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/bookings/${booking.id}/cancel`)
        .set('Authorization', tokens.touristToken())
        .send({ cancelReason: 'Change of plans' })
        .expect(403);
    });
  });

  describe('My bookings', () => {
    it('tourist sees own bookings via GET /bookings/mine', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      await ctx.db.insert(bookings).values({
        id: generateId(),
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate: todayDate(),
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 200000,
        status: 'pending',
      });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/bookings/mine')
        .set('Authorization', tokens.touristToken())
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].touristId).toBe(TOURIST_ID);
    });

    it('guide sees incoming bookings via GET /bookings/mine', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      await ctx.db.insert(bookings).values({
        id: generateId(),
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate: todayDate(),
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 200000,
        status: 'pending',
      });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/bookings/mine')
        .set('Authorization', tokens.guideToken())
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  // --- Internal Stats ---

  describe('GET /api/v1/internal/stats', () => {
    it('returns 403 without X-Internal-Secret header', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/internal/stats').expect(403);
    });

    it('returns aggregated stats with valid secret', async () => {
      const guide = await seedGuide();
      const pkg = await seedPackage(guide.id);
      await ctx.db.insert(bookings).values({
        id: generateId(),
        packageId: pkg.id,
        guideId: guide.id,
        touristId: TOURIST_ID,
        bookingDate: todayDate(),
        startTime: '09:00',
        peopleCount: 1,
        totalPrice: 200000,
        status: 'completed',
      });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/stats')
        .set('X-Internal-Secret', process.env.INTERNAL_SECRET!)
        .expect(200);

      expect(res.body.guides.total).toBe(1);
      expect(res.body.guides.verified).toBe(1);
      expect(res.body.packages.total).toBe(1);
      expect(res.body.packages.active).toBe(1);
      expect(res.body.bookings.total).toBe(1);
      expect(res.body.bookings.completed).toBe(1);
    });
  });
});
