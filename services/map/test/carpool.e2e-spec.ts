import { generateId } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { carpoolPassengers } from '../src/db/schema/carpool-passengers';
import { carpoolRides } from '../src/db/schema/carpool-rides';
import { pointsOfInterest } from '../src/db/schema/points-of-interest';

import {
  DRIVER_ID,
  RESIDENT_ID,
  type E2eContext,
  createE2eApp,
  createTokenFactory,
} from './e2e-helpers';

describe('Carpool Workflow (e2e)', () => {
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
    await ctx.db.delete(carpoolPassengers);
    await ctx.db.delete(carpoolRides);
    await ctx.db.delete(pointsOfInterest);
    await ctx.redis.flushdb();
  });

  // --- Seed helpers ---

  function futureDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  async function seedRide(overrides: Partial<typeof carpoolRides.$inferInsert> = {}) {
    const rows = await ctx.db
      .insert(carpoolRides)
      .values({
        id: generateId(),
        driverId: DRIVER_ID,
        origin: { x: 30.55, y: 25.45 },
        destination: { x: 29.0, y: 25.5 },
        originName: 'الخارجة',
        destinationName: 'الداخلة',
        departureTime: new Date(Date.now() + 86400000), // tomorrow
        seatsTotal: 4,
        seatsTaken: 0,
        pricePerSeat: 5000,
        status: 'open',
        ...overrides,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('seedRide failed');
    return row;
  }

  // --- Public Endpoints ---

  describe('GET /api/v1/carpool (public)', () => {
    it('lists open rides with future departure', async () => {
      await seedRide();
      // Seed a departed ride — should not appear
      await seedRide({
        driverId: RESIDENT_ID,
        status: 'departed',
        originName: 'باريس',
        destinationName: 'الفرافرة',
      });

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/carpool').expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('open');
    });
  });

  // --- Ride Management ---

  describe('POST /api/v1/carpool', () => {
    it('creates a ride', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/carpool')
        .set('Authorization', tokens.driverToken())
        .send({
          origin: { lat: 25.45, lng: 30.55 },
          destination: { lat: 25.5, lng: 29.0 },
          originName: 'الخارجة',
          destinationName: 'الداخلة',
          departureTime: futureDate(),
          seatsTotal: 3,
          pricePerSeat: 5000,
        })
        .expect(201);

      expect(res.body.status).toBe('open');
      expect(res.body.seatsTotal).toBe(3);
      expect(res.body.seatsTaken).toBe(0);
    });

    it('unauthenticated cannot create ride', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/carpool')
        .send({
          origin: { lat: 25.0, lng: 30.0 },
          destination: { lat: 25.5, lng: 29.0 },
          originName: 'A',
          destinationName: 'B',
          departureTime: futureDate(),
          seatsTotal: 2,
        })
        .expect(401);
    });
  });

  // --- Join / Confirm / Decline ---

  describe('Passenger flow', () => {
    it('passenger joins → driver confirms → seats increment', async () => {
      const ride = await seedRide();

      // Passenger joins
      const joinRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .send({ seats: 2 })
        .expect(201);

      expect(joinRes.body.status).toBe('requested');

      // Driver confirms
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/carpool/${ride.id}/passengers/${joinRes.body.id}/confirm`)
        .set('Authorization', tokens.driverToken())
        .expect(200);

      // Verify seats incremented on the ride
      const rideAfterConfirm = await request(ctx.app.getHttpServer())
        .get(`/api/v1/carpool/${ride.id}`)
        .set('Authorization', tokens.driverToken())
        .expect(200);

      expect(rideAfterConfirm.body.seatsTaken).toBe(2);
    });

    it('driver declines passenger', async () => {
      const ride = await seedRide();

      const joinRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .send({ seats: 1 })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/carpool/${ride.id}/passengers/${joinRes.body.id}/decline`)
        .set('Authorization', tokens.driverToken())
        .expect(200);
    });

    it('cannot join own ride', async () => {
      const ride = await seedRide();

      await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.driverToken())
        .send({ seats: 1 })
        .expect(400);
    });

    it('cannot join with insufficient seats', async () => {
      const ride = await seedRide({ seatsTotal: 1 });

      await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .send({ seats: 3 })
        .expect(400);
    });

    it('non-driver cannot confirm passenger', async () => {
      const ride = await seedRide();

      const joinRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .send({ seats: 1 })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/carpool/${ride.id}/passengers/${joinRes.body.id}/confirm`)
        .set('Authorization', tokens.residentToken())
        .expect(403);
    });
  });

  // --- Cancellation ---

  describe('Cancellation', () => {
    it('passenger cancels confirmed join → seats decrement', async () => {
      const ride = await seedRide();

      // Join and confirm
      const joinRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .send({ seats: 2 })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/carpool/${ride.id}/passengers/${joinRes.body.id}/confirm`)
        .set('Authorization', tokens.driverToken())
        .expect(200);

      // Passenger cancels
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .expect(200);

      // Verify seats decremented on the ride
      const rideAfterCancel = await request(ctx.app.getHttpServer())
        .get(`/api/v1/carpool/${ride.id}`)
        .set('Authorization', tokens.driverToken())
        .expect(200);

      expect(rideAfterCancel.body.seatsTaken).toBe(0);
    });

    it('driver cancels ride → all passengers cancelled', async () => {
      const ride = await seedRide();

      // Passenger joins
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/carpool/${ride.id}/join`)
        .set('Authorization', tokens.touristToken())
        .send({ seats: 1 })
        .expect(201);

      // Driver cancels
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/carpool/${ride.id}/cancel`)
        .set('Authorization', tokens.driverToken())
        .expect(200);

      // Verify ride is cancelled
      const rideRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/carpool/${ride.id}`)
        .set('Authorization', tokens.driverToken())
        .expect(200);

      expect(rideRes.body.status).toBe('cancelled');
    });

    it('non-driver cannot cancel ride', async () => {
      const ride = await seedRide();

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/carpool/${ride.id}/cancel`)
        .set('Authorization', tokens.touristToken())
        .expect(403);
    });
  });

  // --- My Rides ---

  describe('GET /api/v1/carpool/my', () => {
    it('returns rides where user is driver or passenger', async () => {
      await seedRide(); // DRIVER_ID is the driver

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/carpool/my')
        .set('Authorization', tokens.driverToken())
        .expect(200);

      expect(res.body.asDriver.length).toBe(1);
    });
  });
});
