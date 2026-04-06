import type { RedisStreamsService } from '@hena-wadeena/nest-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingWalletEventsConsumer } from './booking-wallet-events.consumer';
import type { UsersService } from './users.service';

describe('BookingWalletEventsConsumer', () => {
  const handlers = new Map<string, (msg: { data: Record<string, unknown> }) => Promise<void>>();
  let consumer: BookingWalletEventsConsumer;
  let mockStreams: { subscribe: ReturnType<typeof vi.fn> };
  let mockUsersService: {
    applyBookingWalletEntry: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers.clear();
    mockStreams = {
      subscribe: vi.fn().mockImplementation((stream, _group, _consumer, handler) => {
        handlers.set(stream as string, handler);
      }),
    };
    mockUsersService = {
      applyBookingWalletEntry: vi.fn().mockResolvedValue('applied'),
    };

    consumer = new BookingWalletEventsConsumer(
      mockStreams as unknown as RedisStreamsService,
      mockUsersService as unknown as UsersService,
    );
  });

  it('debits the tourist wallet on booking.requested', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.requested')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: 'tourist-1',
        guideUserId: 'guide-1',
        totalPrice: '150000',
      },
    });

    expect(mockUsersService.applyBookingWalletEntry).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      userId: 'tourist-1',
      amountPiasters: 150000,
      direction: 'debit',
      kind: 'booking_debit',
      idempotencyKey: 'booking.requested:booking-1',
    });
  });

  it('refunds the tourist wallet on booking.cancelled', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.cancelled')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: 'tourist-1',
        guideUserId: 'guide-1',
        totalPrice: '150000',
      },
    });

    expect(mockUsersService.applyBookingWalletEntry).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      userId: 'tourist-1',
      amountPiasters: 150000,
      direction: 'credit',
      kind: 'booking_refund',
      idempotencyKey: 'booking.cancelled:booking-1',
    });
  });

  it('credits the guide wallet on booking.completed', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.completed')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: 'tourist-1',
        guideUserId: 'guide-1',
        totalPrice: '150000',
      },
    });

    expect(mockUsersService.applyBookingWalletEntry).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      userId: 'guide-1',
      amountPiasters: 150000,
      direction: 'credit',
      kind: 'booking_payout',
      idempotencyKey: 'booking.completed:booking-1',
    });
  });

  it('drops booking.requested with non-numeric totalPrice (guards NaN)', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.requested')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: 'tourist-1',
        guideUserId: 'guide-1',
        totalPrice: 'not-a-number',
      },
    });

    expect(mockUsersService.applyBookingWalletEntry).not.toHaveBeenCalled();
  });

  it('drops booking.requested with missing required fields', async () => {
    await consumer.onModuleInit();

    await handlers.get('booking.requested')?.({
      data: {
        bookingId: 'booking-1',
        touristUserId: '',
        totalPrice: '150000',
      },
    });

    expect(mockUsersService.applyBookingWalletEntry).not.toHaveBeenCalled();
  });
});
