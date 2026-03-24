import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, NotificationType } from '@hena-wadeena/types';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { NotificationsService } from './notifications.service';

const CONSUMER_GROUP = 'identity-svc:notifications';
const CONSUMER_NAME = 'identity-worker';

@Injectable()
export class NotificationsEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationsEventsConsumer.name);

  constructor(
    @Inject(RedisStreamsService) private readonly streams: RedisStreamsService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.streams.subscribe(
      EVENTS.BOOKING_REQUESTED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { guideUserId, touristName, packageTitle, bookingId } = d;
        if (!guideUserId) return;
        await this.notificationsService.create({
          userId: guideUserId,
          type: NotificationType.BOOKING_REQUESTED,
          titleAr: 'طلب حجز جديد',
          titleEn: 'New Booking Request',
          bodyAr: `${touristName ?? 'سائح'} طلب حجز "${packageTitle ?? ''}"`,
          bodyEn: `${touristName ?? 'A tourist'} requested booking "${packageTitle ?? ''}"`,
          data: { bookingId },
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_CONFIRMED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { touristUserId, guideName, packageTitle, bookingId } = d;
        if (!touristUserId) return;
        await this.notificationsService.create({
          userId: touristUserId,
          type: NotificationType.BOOKING_CONFIRMED,
          titleAr: 'تم تأكيد الحجز',
          titleEn: 'Booking Confirmed',
          bodyAr: `${guideName ?? 'المرشد'} أكد حجز "${packageTitle ?? ''}"`,
          bodyEn: `${guideName ?? 'The guide'} confirmed your booking "${packageTitle ?? ''}"`,
          data: { bookingId },
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_CANCELLED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { touristUserId, guideUserId, cancelledBy, reason, bookingId } = d;
        const body = reason ? `السبب: ${reason}` : '';
        for (const userId of [touristUserId, guideUserId]) {
          if (!userId) continue;
          await this.notificationsService.create({
            userId,
            type: NotificationType.BOOKING_CANCELLED,
            titleAr: 'تم إلغاء الحجز',
            titleEn: 'Booking Cancelled',
            bodyAr: `الحجز تم إلغاؤه بواسطة ${cancelledBy ?? 'المستخدم'}. ${body}`,
            bodyEn: `Booking cancelled by ${cancelledBy ?? 'the user'}. ${reason ?? ''}`.trim(),
            data: { bookingId, cancelledBy, reason },
          });
        }
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_COMPLETED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { touristUserId, guideUserId, bookingId } = d;
        for (const userId of [touristUserId, guideUserId]) {
          if (!userId) continue;
          await this.notificationsService.create({
            userId,
            type: NotificationType.BOOKING_COMPLETED,
            titleAr: 'اكتمل الحجز',
            titleEn: 'Booking Completed',
            bodyAr: 'تم إكمال الحجز بنجاح',
            bodyEn: 'Your booking has been completed successfully',
            data: { bookingId },
          });
        }
      },
    );

    await this.streams.subscribe(
      EVENTS.REVIEW_SUBMITTED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { targetUserId, reviewerName, rating, reviewId } = d;
        if (!targetUserId) return;
        await this.notificationsService.create({
          userId: targetUserId,
          type: NotificationType.REVIEW_SUBMITTED,
          titleAr: 'تقييم جديد',
          titleEn: 'New Review',
          bodyAr: `${reviewerName ?? 'مستخدم'} أضاف تقييم (${rating ?? '?'}/5)`,
          bodyEn: `${reviewerName ?? 'A user'} submitted a review (${rating ?? '?'}/5)`,
          data: { reviewId, rating: Number(rating) || 0, reviewerName },
        });
      },
    );

    this.logger.log('Notification event consumers registered');
  }
}
