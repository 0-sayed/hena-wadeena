import type { RedisStreamsService } from '@hena-wadeena/nest-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UsersService } from '../users/users.service';

import { NotificationsEventsConsumer } from './notifications-events.consumer';
import type { NotificationsService } from './notifications.service';

describe('NotificationsEventsConsumer booking compatibility', () => {
  const handlers = new Map<string, (msg: { data: Record<string, string> }) => Promise<void>>();
  let consumer: NotificationsEventsConsumer;
  let mockStreams: { subscribe: ReturnType<typeof vi.fn> };
  let mockNotificationsService: { create: ReturnType<typeof vi.fn> };
  let mockUsersService: { findPublicProfiles: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    handlers.clear();
    mockStreams = {
      subscribe: vi.fn().mockImplementation((stream, _group, _consumer, handler) => {
        handlers.set(stream as string, handler);
      }),
    };
    mockNotificationsService = {
      create: vi.fn().mockResolvedValue(undefined),
    };
    mockUsersService = {
      findPublicProfiles: vi.fn().mockResolvedValue([
        {
          id: 'tourist-1',
          fullName: 'Tourist Name',
          displayName: null,
          avatarUrl: null,
          role: 'tourist',
        },
        {
          id: 'guide-1',
          fullName: 'Guide Name',
          displayName: 'Guide Display',
          avatarUrl: null,
          role: 'guide',
        },
      ]),
    };

    consumer = new NotificationsEventsConsumer(
      mockStreams as unknown as RedisStreamsService,
      mockNotificationsService as unknown as NotificationsService,
      mockUsersService as unknown as UsersService,
    );
  });

  it('creates booking request notifications from the emitted booking payload', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.requested')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: 'tourist-1',
        guideUserId: 'guide-1',
        guideProfileId: 'guide-profile-1',
        packageId: 'package-1',
        packageTitleAr: 'جولة الواحات',
        packageTitleEn: 'Oasis Tour',
        totalPrice: '150000',
      },
    });

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'guide-1',
        type: 'booking_requested',
        data: expect.objectContaining({
          bookingId: 'booking-1',
          path: '/bookings',
        }),
      }),
    );
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tourist-1',
        type: 'booking_requested',
        data: expect.objectContaining({
          bookingId: 'booking-1',
          path: '/bookings',
        }),
      }),
    );
  });

  it('creates cancellation notifications from the emitted booking payload', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.cancelled')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: 'tourist-1',
        guideUserId: 'guide-1',
        guideProfileId: 'guide-profile-1',
        packageId: 'package-1',
        packageTitleAr: 'جولة الواحات',
        packageTitleEn: 'Oasis Tour',
        totalPrice: '150000',
        cancellationReason: 'Change of plans',
        cancelledByRole: 'tourist',
        cancelledByUserId: 'tourist-1',
      },
    });

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'booking_cancelled',
        data: expect.objectContaining({
          bookingId: 'booking-1',
          reason: 'Change of plans',
        }),
      }),
    );
  });
});
