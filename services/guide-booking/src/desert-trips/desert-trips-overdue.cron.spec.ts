import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../test/mock-db';

import { DesertTripsOverdueCron } from './desert-trips-overdue.cron';

// Enriched trip shape returned by the JOIN query in fetchOverdue
const mockEnrichedTrip = {
  id: 'trip-uuid-1',
  bookingId: 'booking-uuid-1',
  destinationName: 'White Desert',
  emergencyContact: '+201012345678',
  touristId: 'tourist-uuid-1',
  guideUserId: 'guide-user-uuid-1',
};

describe('DesertTripsOverdueCron', () => {
  let cron: DesertTripsOverdueCron;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedis = { publish: vi.fn().mockResolvedValue('ok') };
    cron = new DesertTripsOverdueCron(mockDb as any, mockRedis as any);
  });

  it('does nothing when no overdue trips exist', async () => {
    mockDb.then.mockImplementationOnce((r: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(r),
    );

    await cron.checkOverdueTrips();

    expect(mockRedis.publish).not.toHaveBeenCalled();
  });

  it('marks overdue trips and emits one event per trip', async () => {
    mockDb.then
      // SELECT overdue trips (JOIN query)
      .mockImplementationOnce((r: (v: unknown[]) => unknown) =>
        Promise.resolve([mockEnrichedTrip]).then(r),
      )
      // batch UPDATE to 'overdue'
      .mockImplementationOnce((r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r))
      // batch UPDATE to 'alert_sent'
      .mockImplementationOnce((r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r));

    await cron.checkOverdueTrips();

    expect(mockRedis.publish).toHaveBeenCalledOnce();
    const [eventName, payload] = mockRedis.publish.mock.calls[0] as [
      string,
      Record<string, string>,
    ];
    expect(eventName).toBe('desert_trip.overdue');
    expect(payload.tripId).toBe('trip-uuid-1');
    expect(payload.emergencyContact).toBe('+201012345678');
    expect(payload.guideUserId).toBe('guide-user-uuid-1');
    expect(payload.touristUserId).toBe('tourist-uuid-1');
  });
});
