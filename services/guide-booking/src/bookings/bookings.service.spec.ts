import type { RedisStreamsService } from '@hena-wadeena/nest-common';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateTransition } from './booking-state-machine';
import { BookingsService } from './bookings.service';

describe('booking-state-machine', () => {
  describe('validateTransition', () => {
    it('pending → confirmed: valid', () => {
      const t = validateTransition('pending', 'confirmed');
      expect(t.from).toBe('pending');
      expect(t.to).toBe('confirmed');
    });

    it('pending → cancelled: valid', () => {
      const t = validateTransition('pending', 'cancelled');
      expect(t.to).toBe('cancelled');
    });

    it('confirmed → in_progress: valid', () => {
      const t = validateTransition('confirmed', 'in_progress');
      expect(t.to).toBe('in_progress');
      expect(t.event).toBeNull();
    });

    it('confirmed → cancelled: valid', () => {
      const t = validateTransition('confirmed', 'cancelled');
      expect(t.to).toBe('cancelled');
    });

    it('in_progress → completed: valid', () => {
      const t = validateTransition('in_progress', 'completed');
      expect(t.to).toBe('completed');
    });

    it('in_progress → cancelled: valid', () => {
      const t = validateTransition('in_progress', 'cancelled');
      expect(t.to).toBe('cancelled');
    });

    it('completed → any: throws BadRequestException', () => {
      expect(() => validateTransition('completed', 'cancelled')).toThrow(BadRequestException);
    });

    it('cancelled → any: throws BadRequestException', () => {
      expect(() => validateTransition('cancelled', 'confirmed')).toThrow(BadRequestException);
    });

    it('pending → completed: throws (skip states)', () => {
      expect(() => validateTransition('pending', 'completed')).toThrow(BadRequestException);
    });

    it('pending → in_progress: throws (skip states)', () => {
      expect(() => validateTransition('pending', 'in_progress')).toThrow(BadRequestException);
    });
  });
});

// ─── Mock DB ────────────────────────────────────────────────────────────────

type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockChain {
  const chain = {} as MockChain;
  for (const method of [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
    'insert',
    'values',
    'returning',
    'update',
    'set',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi
    .fn()
    .mockImplementation((onFulfilled: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(onFulfilled),
    );
  chain.execute = vi.fn().mockResolvedValue([]);
  return chain;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const FUTURE_BOOKING_DATE = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
})();

const mockPackage = {
  id: 'pkg-uuid-1',
  guideId: 'guide-uuid-1',
  titleAr: 'جولة الواحات',
  titleEn: 'Oasis Tour',
  price: 5000, // 50 EGP per person
  maxPeople: 10,
  status: 'active',
  deletedAt: null,
};

const mockGuide = {
  id: 'guide-uuid-1',
  userId: 'guide-user-uuid',
  active: true,
  licenseVerified: true,
  deletedAt: null,
};

const mockBooking = {
  id: 'booking-uuid-1',
  packageId: 'pkg-uuid-1',
  guideId: 'guide-uuid-1',
  touristId: 'tourist-uuid-1',
  bookingDate: FUTURE_BOOKING_DATE,
  startTime: '09:00',
  peopleCount: 2,
  totalPrice: 10000,
  status: 'pending',
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-03-20'),
  updatedAt: new Date('2026-03-20'),
};

// ─── BookingsService ────────────────────────────────────────────────────────

describe('BookingsService', () => {
  let service: BookingsService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedisStreams: RedisStreamsService;
  let mockPublish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockPublish = vi.fn().mockResolvedValue('stream-id');
    mockRedisStreams = { publish: mockPublish } as unknown as RedisStreamsService;
    service = new BookingsService(mockDb as any, mockRedisStreams);
  });

  function mockNextQuery(results: unknown[]) {
    mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
      Promise.resolve(results).then(resolve),
    );
  }

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      packageId: 'pkg-uuid-1',
      bookingDate: FUTURE_BOOKING_DATE,
      startTime: '09:00',
      peopleCount: 2,
    };

    it('success: creates booking with correct totalPrice and publishes event', async () => {
      mockNextQuery([mockPackage]);
      mockNextQuery([mockGuide]);
      mockNextQuery([]); // no blocked dates
      mockNextQuery([mockBooking]);

      const result = await service.create(dto, 'tourist-uuid-1');
      expect(result).toEqual(mockBooking);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          touristId: 'tourist-uuid-1',
          totalPrice: 10000, // 5000 * 2
          status: 'pending',
        }),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        'booking.requested',
        expect.objectContaining({
          bookingId: 'booking-uuid-1',
          touristId: 'tourist-uuid-1',
          guideId: 'guide-uuid-1',
        }),
      );
    });

    it('package not found: throws NotFoundException', async () => {
      mockNextQuery([]);
      await expect(service.create(dto, 'tourist-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('guide inactive: throws BadRequestException', async () => {
      mockNextQuery([mockPackage]);
      mockNextQuery([{ ...mockGuide, active: false }]);
      await expect(service.create(dto, 'tourist-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('guide unverified: throws BadRequestException', async () => {
      mockNextQuery([mockPackage]);
      mockNextQuery([{ ...mockGuide, licenseVerified: false }]);
      await expect(service.create(dto, 'tourist-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('date blocked: throws ConflictException', async () => {
      mockNextQuery([mockPackage]);
      mockNextQuery([mockGuide]);
      mockNextQuery([{ id: 'avail-1', isBlocked: true }]);
      await expect(service.create(dto, 'tourist-uuid-1')).rejects.toThrow(ConflictException);
    });

    it('date in past: throws BadRequestException', async () => {
      const dto2 = { ...dto, bookingDate: '2020-01-01' };
      mockNextQuery([mockPackage]);
      mockNextQuery([mockGuide]);
      await expect(service.create(dto2, 'tourist-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('people count exceeds max: throws BadRequestException', async () => {
      mockNextQuery([{ ...mockPackage, maxPeople: 1 }]);
      mockNextQuery([mockGuide]);
      mockNextQuery([]);
      await expect(service.create(dto, 'tourist-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────

  describe('findById', () => {
    it('found + participant: returns booking', async () => {
      mockNextQuery([mockBooking]);
      const result = await service.findById('booking-uuid-1', {
        sub: 'tourist-uuid-1',
        role: 'tourist',
      });
      expect(result.id).toBe('booking-uuid-1');
    });

    it('found + guide participant: returns booking', async () => {
      mockNextQuery([mockBooking]);
      const result = await service.findById('booking-uuid-1', {
        sub: 'guide-user-uuid',
        role: 'guide',
        guideId: 'guide-uuid-1',
      });
      expect(result.id).toBe('booking-uuid-1');
    });

    it('found + admin: returns booking', async () => {
      mockNextQuery([mockBooking]);
      const result = await service.findById('booking-uuid-1', {
        sub: 'admin-uuid',
        role: 'admin',
      });
      expect(result.id).toBe('booking-uuid-1');
    });

    it('not found: throws NotFoundException', async () => {
      mockNextQuery([]);
      await expect(
        service.findById('nonexistent', { sub: 'tourist-uuid-1', role: 'tourist' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('not participant: throws ForbiddenException', async () => {
      mockNextQuery([mockBooking]);
      await expect(
        service.findById('booking-uuid-1', { sub: 'other-user', role: 'tourist' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── transition ─────────────────────────────────────────────────────────

  describe('transition', () => {
    it('confirm: pending → confirmed, publishes event', async () => {
      mockNextQuery([{ ...mockBooking, status: 'pending' }]);
      mockNextQuery([{ ...mockBooking, status: 'confirmed' }]);

      const result = await service.transition('booking-uuid-1', 'confirmed', {
        sub: 'guide-user-uuid',
        role: 'guide',
        guideId: 'guide-uuid-1',
      });
      expect(result.status).toBe('confirmed');
      expect(mockPublish).toHaveBeenCalledWith('booking.confirmed', expect.any(Object));
    });

    it('start: confirmed → in_progress on booking date, no event published', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockNextQuery([{ ...mockBooking, status: 'confirmed', bookingDate: today }]);
      mockNextQuery([{ ...mockBooking, status: 'in_progress', bookingDate: today }]);

      const result = await service.transition('booking-uuid-1', 'in_progress', {
        sub: 'guide-user-uuid',
        role: 'guide',
        guideId: 'guide-uuid-1',
      });
      expect(result.status).toBe('in_progress');
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('start: wrong date throws BadRequestException', async () => {
      mockNextQuery([{ ...mockBooking, status: 'confirmed', bookingDate: '2099-01-01' }]);

      await expect(
        service.transition('booking-uuid-1', 'in_progress', {
          sub: 'guide-user-uuid',
          role: 'guide',
          guideId: 'guide-uuid-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('complete: in_progress → completed, publishes event', async () => {
      mockNextQuery([{ ...mockBooking, status: 'in_progress' }]);
      mockNextQuery([{ ...mockBooking, status: 'completed' }]);

      const result = await service.transition('booking-uuid-1', 'completed', {
        sub: 'guide-user-uuid',
        role: 'guide',
        guideId: 'guide-uuid-1',
      });
      expect(result.status).toBe('completed');
      expect(mockPublish).toHaveBeenCalledWith('booking.completed', expect.any(Object));
    });

    it('cancel: sets cancelledAt and cancelReason, publishes event', async () => {
      mockNextQuery([{ ...mockBooking, status: 'pending' }]);
      mockNextQuery([{ ...mockBooking, status: 'cancelled' }]);

      await service.transition(
        'booking-uuid-1',
        'cancelled',
        { sub: 'tourist-uuid-1', role: 'tourist' },
        'Changed my plans',
      );
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          cancelReason: 'Changed my plans',
          cancelledAt: expect.any(Date),
        }),
      );
      expect(mockPublish).toHaveBeenCalledWith('booking.cancelled', expect.any(Object));
    });

    it('invalid transition: throws BadRequestException', async () => {
      mockNextQuery([{ ...mockBooking, status: 'completed' }]);

      await expect(
        service.transition('booking-uuid-1', 'cancelled', {
          sub: 'tourist-uuid-1',
          role: 'tourist',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('non-participant: throws ForbiddenException', async () => {
      mockNextQuery([{ ...mockBooking, status: 'pending' }]);

      await expect(
        service.transition('booking-uuid-1', 'confirmed', {
          sub: 'other-user',
          role: 'guide',
          guideId: 'other-guide-id',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tourist cannot confirm own booking: throws ForbiddenException', async () => {
      mockNextQuery([{ ...mockBooking, status: 'pending' }]);

      await expect(
        service.transition('booking-uuid-1', 'confirmed', {
          sub: 'tourist-uuid-1',
          role: 'tourist',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tourist cannot start booking: throws ForbiddenException', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockNextQuery([{ ...mockBooking, status: 'confirmed', bookingDate: today }]);

      await expect(
        service.transition('booking-uuid-1', 'in_progress', {
          sub: 'tourist-uuid-1',
          role: 'tourist',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tourist cannot complete booking: throws ForbiddenException', async () => {
      mockNextQuery([{ ...mockBooking, status: 'in_progress' }]);

      await expect(
        service.transition('booking-uuid-1', 'completed', {
          sub: 'tourist-uuid-1',
          role: 'tourist',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tourist cannot cancel in_progress booking: throws ForbiddenException', async () => {
      mockNextQuery([{ ...mockBooking, status: 'in_progress' }]);

      await expect(
        service.transition(
          'booking-uuid-1',
          'cancelled',
          {
            sub: 'tourist-uuid-1',
            role: 'tourist',
          },
          'Changed plans',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tourist CAN cancel pending booking', async () => {
      mockNextQuery([{ ...mockBooking, status: 'pending' }]);
      mockNextQuery([{ ...mockBooking, status: 'cancelled' }]);

      const result = await service.transition(
        'booking-uuid-1',
        'cancelled',
        { sub: 'tourist-uuid-1', role: 'tourist' },
        'Changed plans',
      );
      expect(result.status).toBe('cancelled');
    });
  });

  // ─── findMyBookings ─────────────────────────────────────────────────────

  describe('findMyBookings', () => {
    it('as tourist: returns bookings where touristId matches', async () => {
      mockNextQuery([mockBooking]); // data
      mockNextQuery([{ total: 1 }]); // count

      const result = await service.findMyBookings(
        { sub: 'tourist-uuid-1', role: 'tourist' },
        { offset: 0, limit: 20 },
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('as guide: returns bookings where guideId matches', async () => {
      mockNextQuery([mockBooking]);
      mockNextQuery([{ total: 1 }]);

      const result = await service.findMyBookings(
        { sub: 'guide-user-uuid', role: 'guide', guideId: 'guide-uuid-1' },
        { offset: 0, limit: 20 },
      );
      expect(result.data).toHaveLength(1);
    });

    it('empty results: returns empty data and total=0', async () => {
      mockNextQuery([]);
      mockNextQuery([{ total: 0 }]);

      const result = await service.findMyBookings(
        { sub: 'tourist-uuid-1', role: 'tourist' },
        { offset: 0, limit: 20 },
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  // ─── adminFindAll ───────────────────────────────────────────────────────

  describe('adminFindAll', () => {
    it('returns all bookings paginated', async () => {
      mockNextQuery([mockBooking, { ...mockBooking, id: 'booking-uuid-2' }]);
      mockNextQuery([{ total: 2 }]);

      const result = await service.adminFindAll({ offset: 0, limit: 20 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
