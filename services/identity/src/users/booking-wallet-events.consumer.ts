import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { UsersService } from './users.service';

const CONSUMER_GROUP = 'identity-svc:wallet';
const CONSUMER_NAME = 'identity-wallet-worker';

@Injectable()
export class BookingWalletEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(BookingWalletEventsConsumer.name);

  constructor(
    @Inject(RedisStreamsService) private readonly streams: RedisStreamsService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.streams.subscribe(
      EVENTS.BOOKING_REQUESTED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const fields = this.parseWalletFields(msg.data, 'touristUserId');
        if (!fields) return;
        await this.usersService.applyBookingWalletEntry({
          bookingId: fields.bookingId,
          userId: fields.userId,
          amountPiasters: fields.amountPiasters,
          direction: 'debit',
          kind: 'booking_debit',
          idempotencyKey: `${EVENTS.BOOKING_REQUESTED}:${fields.bookingId}`,
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_CANCELLED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const fields = this.parseWalletFields(msg.data, 'touristUserId');
        if (!fields) return;
        await this.usersService.applyBookingWalletEntry({
          bookingId: fields.bookingId,
          userId: fields.userId,
          amountPiasters: fields.amountPiasters,
          direction: 'credit',
          kind: 'booking_refund',
          idempotencyKey: `${EVENTS.BOOKING_CANCELLED}:${fields.bookingId}`,
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_COMPLETED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const fields = this.parseWalletFields(msg.data, 'guideUserId');
        if (!fields) return;
        await this.usersService.applyBookingWalletEntry({
          bookingId: fields.bookingId,
          userId: fields.userId,
          amountPiasters: fields.amountPiasters,
          direction: 'credit',
          kind: 'booking_payout',
          idempotencyKey: `${EVENTS.BOOKING_COMPLETED}:${fields.bookingId}`,
        });
      },
    );

    this.logger.log('Booking wallet event consumers registered');
  }

  /**
   * Validate the wallet-relevant fields from a booking event. Returns null and
   * logs a warning if any required field is missing or the amount is not a
   * finite positive integer — we drop the message rather than poisoning the
   * ledger with empty UUIDs or NaN amounts.
   */
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
