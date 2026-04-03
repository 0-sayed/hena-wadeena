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
        const payload = msg.data as Record<string, string>;
        await this.usersService.applyBookingWalletEntry({
          bookingId: payload.bookingId ?? '',
          userId: payload.touristUserId ?? '',
          amountPiasters: Number(payload.totalPrice ?? '0'),
          direction: 'debit',
          kind: 'booking_debit',
          idempotencyKey: `${EVENTS.BOOKING_REQUESTED}:${payload.bookingId ?? ''}`,
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_CANCELLED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const payload = msg.data as Record<string, string>;
        await this.usersService.assertBookingLedgerExists(payload.bookingId ?? '', 'booking_debit');
        await this.usersService.applyBookingWalletEntry({
          bookingId: payload.bookingId ?? '',
          userId: payload.touristUserId ?? '',
          amountPiasters: Number(payload.totalPrice ?? '0'),
          direction: 'credit',
          kind: 'booking_refund',
          idempotencyKey: `${EVENTS.BOOKING_CANCELLED}:${payload.bookingId ?? ''}`,
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_COMPLETED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const payload = msg.data as Record<string, string>;
        await this.usersService.assertBookingLedgerExists(payload.bookingId ?? '', 'booking_debit');
        await this.usersService.applyBookingWalletEntry({
          bookingId: payload.bookingId ?? '',
          userId: payload.guideUserId ?? '',
          amountPiasters: Number(payload.totalPrice ?? '0'),
          direction: 'credit',
          kind: 'booking_payout',
          idempotencyKey: `${EVENTS.BOOKING_COMPLETED}:${payload.bookingId ?? ''}`,
        });
      },
    );

    this.logger.log('Booking wallet event consumers registered');
  }
}
