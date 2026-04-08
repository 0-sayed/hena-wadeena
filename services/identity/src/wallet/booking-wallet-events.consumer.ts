import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { WalletService } from './wallet.service';

const CONSUMER_GROUP = 'identity-svc:wallet';
const CONSUMER_NAME = 'identity-wallet-worker';

@Injectable()
export class BookingWalletEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(BookingWalletEventsConsumer.name);

  constructor(
    @Inject(RedisStreamsService) private readonly streams: RedisStreamsService,
    @Inject(WalletService) private readonly walletService: WalletService,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.streams.subscribe(
        EVENTS.BOOKING_REQUESTED,
        CONSUMER_GROUP,
        CONSUMER_NAME,
        async (msg) => {
          const fields = this.parseWalletFields(msg.data, 'touristUserId');
          if (!fields) return;
          await this.walletService.applyWalletEntry({
            refId: fields.bookingId,
            userId: fields.userId,
            amountPiasters: fields.amountPiasters,
            direction: 'debit',
            refType: 'booking',
            idempotencyKey: `${EVENTS.BOOKING_REQUESTED}:${fields.bookingId}`,
          });
        },
      ),
      this.streams.subscribe(
        EVENTS.BOOKING_CANCELLED,
        CONSUMER_GROUP,
        CONSUMER_NAME,
        async (msg) => {
          const fields = this.parseWalletFields(msg.data, 'touristUserId');
          if (!fields) return;
          await this.walletService.applyWalletEntry({
            refId: fields.bookingId,
            userId: fields.userId,
            amountPiasters: fields.amountPiasters,
            direction: 'credit',
            refType: 'booking',
            idempotencyKey: `${EVENTS.BOOKING_CANCELLED}:${fields.bookingId}`,
          });
        },
      ),
      this.streams.subscribe(
        EVENTS.BOOKING_COMPLETED,
        CONSUMER_GROUP,
        CONSUMER_NAME,
        async (msg) => {
          const fields = this.parseWalletFields(msg.data, 'guideUserId');
          if (!fields) return;
          await this.walletService.applyWalletEntry({
            refId: fields.bookingId,
            userId: fields.userId,
            amountPiasters: fields.amountPiasters,
            direction: 'credit',
            refType: 'booking',
            idempotencyKey: `${EVENTS.BOOKING_COMPLETED}:${fields.bookingId}`,
          });
        },
      ),
    ]);

    this.logger.log('Booking wallet event consumers registered');
  }

  // Validates wallet-relevant fields from a booking event.
  // Returns null and logs a warning on invalid data — we drop rather than
  // throw to prevent a single malformed message from poisoning the ledger
  // or blocking the consumer group.
  private parseWalletFields(
    data: Record<string, unknown>,
    userIdField: 'touristUserId' | 'guideUserId',
  ): { bookingId: string; userId: string; amountPiasters: number } | null {
    const bookingId = typeof data.bookingId === 'string' ? data.bookingId : '';
    const userId = typeof data[userIdField] === 'string' ? data[userIdField] : '';
    const rawTotal = typeof data.totalPrice === 'string' ? data.totalPrice : '';
    const amountPiasters = Number.parseInt(rawTotal, 10);

    if (!bookingId || !userId || !Number.isFinite(amountPiasters) || amountPiasters <= 0) {
      this.logger.warn(
        `Dropping malformed wallet event: bookingId=${bookingId || '<empty>'} ${userIdField}=${userId || '<empty>'} totalPrice=${rawTotal || '<empty>'}`,
      );
      return null;
    }

    return { bookingId, userId, amountPiasters };
  }
}
