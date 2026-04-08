import { EVENTS } from '@hena-wadeena/types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BookingWalletEventsConsumer } from './booking-wallet-events.consumer';

const validMsg = (overrides: Record<string, unknown> = {}) => ({
  id: 'stream-id',
  data: {
    bookingId: 'booking-uuid',
    touristUserId: 'tourist-uuid',
    guideUserId: 'guide-uuid',
    totalPrice: '5000',
    ...overrides,
  },
});

describe('BookingWalletEventsConsumer', () => {
  let consumer: BookingWalletEventsConsumer;
  let mockStreams: { subscribe: ReturnType<typeof vi.fn> };
  let mockWalletService: { applyWalletEntry: ReturnType<typeof vi.fn> };

  // Capture the handler registered for a given event key so tests can invoke it directly.
  const capturedHandlers = new Map<string, (msg: ReturnType<typeof validMsg>) => Promise<void>>();

  beforeEach(async () => {
    capturedHandlers.clear();

    mockStreams = {
      subscribe: vi.fn(
        (
          event: string,
          _group: string,
          _consumer: string,
          handler: (msg: ReturnType<typeof validMsg>) => Promise<void>,
        ) => {
          capturedHandlers.set(event, handler);
          return Promise.resolve();
        },
      ),
    };

    mockWalletService = { applyWalletEntry: vi.fn().mockResolvedValue('applied') };

    consumer = new BookingWalletEventsConsumer(mockStreams as any, mockWalletService as any);
    await consumer.onModuleInit();
  });

  describe('BOOKING_REQUESTED handler', () => {
    it('calls applyWalletEntry with direction=debit and refType=booking', async () => {
      const handler = capturedHandlers.get(EVENTS.BOOKING_REQUESTED)!;
      await handler(validMsg());

      expect(mockWalletService.applyWalletEntry).toHaveBeenCalledOnce();
      expect(mockWalletService.applyWalletEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          refId: 'booking-uuid',
          userId: 'tourist-uuid',
          amountPiasters: 5000,
          direction: 'debit',
          refType: 'booking',
          idempotencyKey: `${EVENTS.BOOKING_REQUESTED}:booking-uuid`,
        }),
      );
    });

    it('drops malformed message (missing bookingId) without throwing', async () => {
      const handler = capturedHandlers.get(EVENTS.BOOKING_REQUESTED)!;
      await handler(validMsg({ bookingId: '' }));
      expect(mockWalletService.applyWalletEntry).not.toHaveBeenCalled();
    });
  });

  describe('BOOKING_CANCELLED handler', () => {
    it('calls applyWalletEntry with direction=credit and refType=booking (not refund)', async () => {
      const handler = capturedHandlers.get(EVENTS.BOOKING_CANCELLED)!;
      await handler(validMsg());

      expect(mockWalletService.applyWalletEntry).toHaveBeenCalledOnce();
      expect(mockWalletService.applyWalletEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          refId: 'booking-uuid',
          userId: 'tourist-uuid',
          amountPiasters: 5000,
          direction: 'credit',
          refType: 'booking',
          idempotencyKey: `${EVENTS.BOOKING_CANCELLED}:booking-uuid`,
        }),
      );
    });

    it('drops malformed message (non-numeric totalPrice) without throwing', async () => {
      const handler = capturedHandlers.get(EVENTS.BOOKING_CANCELLED)!;
      await handler(validMsg({ totalPrice: 'bad' }));
      expect(mockWalletService.applyWalletEntry).not.toHaveBeenCalled();
    });
  });

  describe('BOOKING_COMPLETED handler', () => {
    it('calls applyWalletEntry with direction=credit, refType=booking, using guideUserId', async () => {
      const handler = capturedHandlers.get(EVENTS.BOOKING_COMPLETED)!;
      await handler(validMsg());

      expect(mockWalletService.applyWalletEntry).toHaveBeenCalledOnce();
      expect(mockWalletService.applyWalletEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          refId: 'booking-uuid',
          userId: 'guide-uuid',
          amountPiasters: 5000,
          direction: 'credit',
          refType: 'booking',
          idempotencyKey: `${EVENTS.BOOKING_COMPLETED}:booking-uuid`,
        }),
      );
    });

    it('drops malformed message (missing guideUserId) without throwing', async () => {
      const handler = capturedHandlers.get(EVENTS.BOOKING_COMPLETED)!;
      await handler(validMsg({ guideUserId: '' }));
      expect(mockWalletService.applyWalletEntry).not.toHaveBeenCalled();
    });
  });
});
