import { UserRole } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { createMockDb } from '../test/mock-db';

import { DesertTripsService } from './desert-trips.service';

const mockBooking = {
  id: 'booking-uuid-1',
  guideId: 'guide-uuid-1',
  touristId: 'tourist-uuid-1',
  status: 'confirmed',
};

const mockGuide = { id: 'guide-uuid-1', userId: 'guide-user-uuid-1' };

const mockTrip = {
  id: 'trip-uuid-1',
  bookingId: 'booking-uuid-1',
  expectedArrivalAt: new Date('2026-04-10T14:00:00Z'),
  destinationName: 'White Desert',
  emergencyContact: '+201012345678',
  rangerStationId: null,
  checkedInAt: null,
  alertTriggeredAt: null,
  gpsBreadcrumbs: [],
  status: 'pending',
  createdAt: new Date('2026-04-10T08:00:00Z'),
};

describe('DesertTripsService', () => {
  let service: DesertTripsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new DesertTripsService(mockDb as any);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a trip plan when guide owns the booking', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r));
      mockDb.returning!.mockResolvedValue([mockTrip]);

      const result = await service.register('booking-uuid-1', 'guide-user-uuid-1', {
        expectedArrivalAt: '2026-04-10T14:00:00Z',
        destinationName: 'White Desert',
        emergencyContact: '+201012345678',
      });

      expect(result.status).toBe('pending');
      expect(result.destinationName).toBe('White Desert');
    });

    it('throws ForbiddenException when caller is not the guide for this booking', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([{ id: 'guide-uuid-99', userId: 'other-user' }]).then(r),
        );

      await expect(
        service.register('booking-uuid-1', 'wrong-user', {
          expectedArrivalAt: '2026-04-10T14:00:00Z',
          destinationName: 'White Desert',
          emergencyContact: '+201012345678',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when booking does not exist', async () => {
      mockDb.then.mockImplementationOnce((r: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(r),
      );

      await expect(
        service.register('bad-booking', 'guide-user-uuid-1', {
          expectedArrivalAt: '2026-04-10T14:00:00Z',
          destinationName: 'White Desert',
          emergencyContact: '+201012345678',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when a trip plan already exists for this booking', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockTrip]).then(r),
        );

      await expect(
        service.register('booking-uuid-1', 'guide-user-uuid-1', {
          expectedArrivalAt: '2026-04-10T14:00:00Z',
          destinationName: 'White Desert',
          emergencyContact: '+201012345678',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── addBreadcrumb ───────────────────────────────────────────────────────────

  describe('addBreadcrumb', () => {
    it('appends breadcrumb to the JSONB array', async () => {
      const tripWithBreadcrumb = {
        ...mockTrip,
        gpsBreadcrumbs: [{ lat: 27.1, lng: 27.9, ts: '2026-04-10T10:00:00Z' }],
      };
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockTrip]).then(r),
        );
      mockDb.returning!.mockResolvedValue([tripWithBreadcrumb]);

      const result = await service.addBreadcrumb('booking-uuid-1', 'guide-user-uuid-1', {
        lat: 27.1,
        lng: 27.9,
      });

      expect(result.gpsBreadcrumbs).toHaveLength(1);
      expect(result.gpsBreadcrumbs[0]!.lat).toBe(27.1);
    });

    it('throws BadRequestException when trip is already checked_in', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([{ ...mockTrip, status: 'checked_in' }]).then(r),
        );

      await expect(
        service.addBreadcrumb('booking-uuid-1', 'guide-user-uuid-1', { lat: 27.1, lng: 27.9 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── checkIn ─────────────────────────────────────────────────────────────────

  describe('checkIn', () => {
    it('sets checkedInAt and status to checked_in', async () => {
      const checkedInTrip = { ...mockTrip, status: 'checked_in', checkedInAt: new Date() };
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockTrip]).then(r),
        );
      mockDb.returning!.mockResolvedValue([checkedInTrip]);

      const result = await service.checkIn('booking-uuid-1', 'guide-user-uuid-1');

      expect(result.status).toBe('checked_in');
      expect(result.checkedInAt).toBeDefined();
    });
  });

  // ── findByBooking ───────────────────────────────────────────────────────────

  describe('findByBooking', () => {
    it('returns trip for the guide', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockTrip]).then(r),
        );

      const result = await service.findByBooking(
        'booking-uuid-1',
        'guide-user-uuid-1',
        UserRole.GUIDE,
      );
      expect(result.id).toBe('trip-uuid-1');
    });

    it('returns trip for the tourist', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockTrip]).then(r),
        );

      const result = await service.findByBooking(
        'booking-uuid-1',
        'tourist-uuid-1',
        UserRole.TOURIST,
      );
      expect(result.id).toBe('trip-uuid-1');
    });

    it('throws NotFoundException when no trip exists', async () => {
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockBooking]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(r),
        )
        .mockImplementationOnce((r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r));

      await expect(
        service.findByBooking('booking-uuid-1', 'guide-user-uuid-1', UserRole.GUIDE),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
