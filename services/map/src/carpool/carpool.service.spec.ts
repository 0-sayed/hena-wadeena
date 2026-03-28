import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CarpoolService } from './carpool.service';

type ThenFn = (onFulfilled: (v: unknown[]) => unknown) => Promise<unknown>;

type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn<ThenFn>>;
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
    'innerJoin',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = vi
    .fn<ThenFn>()
    .mockImplementation((onFulfilled) => Promise.resolve([]).then(onFulfilled));

  // transaction mock: call the callback with the same mock db
  (chain as Record<string, unknown>).transaction = vi
    .fn()
    .mockImplementation((fn: (tx: MockChain) => Promise<unknown>) => fn(chain));

  return chain;
}

const futureDate = new Date(Date.now() + 86400000); // tomorrow

const mockRide = {
  id: 'ride-uuid-1',
  driverId: 'driver-uuid-1',
  origin: { x: 30.55, y: 25.44 },
  destination: { x: 30.75, y: 25.68 },
  originName: 'Al-Kharga',
  destinationName: 'Al-Dakhla',
  departureTime: futureDate,
  seatsTotal: 3,
  seatsTaken: 0,
  pricePerSeat: 0,
  notes: null,
  status: 'open' as const,
  createdAt: new Date(),
};

const mockPassenger = {
  id: 'passenger-uuid-1',
  rideId: 'ride-uuid-1',
  userId: 'user-uuid-1',
  seats: 1,
  status: 'requested' as const,
  joinedAt: new Date(),
};

describe('CarpoolService', () => {
  let service: CarpoolService;
  let mockDb: MockChain;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new CarpoolService(mockDb as never);
  });

  describe('createRide', () => {
    it('should create a ride with open status', async () => {
      const created = { ...mockRide };
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([created]).then(fn),
      );

      const result = await service.createRide(
        {
          origin: { lat: 25.44, lng: 30.55 },
          destination: { lat: 25.68, lng: 30.75 },
          originName: 'Al-Kharga',
          destinationName: 'Al-Dakhla',
          departureTime: futureDate,
          seatsTotal: 3,
          pricePerSeat: 0,
        },
        'driver-uuid-1',
      );

      expect(result.status).toBe('open');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('joinRide', () => {
    it('should create a passenger with requested status', async () => {
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockRide]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPassenger]).then(fn),
      );

      const result = await service.joinRide('ride-uuid-1', 'user-uuid-1', { seats: 1 });

      expect(result.status).toBe('requested');
    });

    it('should throw BadRequestException when joining own ride', async () => {
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockRide]).then(fn),
      );

      await expect(service.joinRide('ride-uuid-1', 'driver-uuid-1', { seats: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when ride is not open', async () => {
      const fullRide = { ...mockRide, status: 'full' as const };
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([fullRide]).then(fn),
      );

      await expect(service.joinRide('ride-uuid-1', 'user-uuid-1', { seats: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when not enough seats', async () => {
      const almostFull = { ...mockRide, seatsTaken: 2 };
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([almostFull]).then(fn),
      );

      await expect(service.joinRide('ride-uuid-1', 'user-uuid-1', { seats: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmPassenger', () => {
    it('should confirm passenger and increment seatsTaken', async () => {
      const confirmedPassenger = { ...mockPassenger, status: 'confirmed' as const };

      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPassenger]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockRide]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([confirmedPassenger]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([{ ...mockRide, seatsTaken: 1 }]).then(fn),
      );

      const result = await service.confirmPassenger(
        'ride-uuid-1',
        'passenger-uuid-1',
        'driver-uuid-1',
      );

      expect(result.status).toBe('confirmed');
    });

    it('should throw ForbiddenException if not ride owner', async () => {
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPassenger]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockRide]).then(fn),
      );

      await expect(
        service.confirmPassenger('ride-uuid-1', 'passenger-uuid-1', 'not-driver'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelRide', () => {
    it('should cancel ride and all passengers', async () => {
      const cancelled = { ...mockRide, status: 'cancelled' as const };

      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockRide]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([cancelled]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(fn),
      );

      const result = await service.cancelRide('ride-uuid-1', 'driver-uuid-1');

      expect(result.status).toBe('cancelled');
    });

    it('should throw ForbiddenException if not ride owner', async () => {
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockRide]).then(fn),
      );

      await expect(service.cancelRide('ride-uuid-1', 'not-driver')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
