import { RedisStreamsService } from '@hena-wadeena/nest-common';
import type { BookingCancelledEventPayload, BookingEventPayload } from '@hena-wadeena/types';
import { EVENTS, NotificationType } from '@hena-wadeena/types';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { UsersService } from '../users/users.service';

import { NotificationsService } from './notifications.service';

const CONSUMER_GROUP = 'identity-svc:notifications';
const CONSUMER_NAME = 'identity-worker';

@Injectable()
export class NotificationsEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationsEventsConsumer.name);

  constructor(
    @Inject(RedisStreamsService) private readonly streams: RedisStreamsService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.streams.subscribe(
      EVENTS.LISTING_INQUIRY_RECEIVED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { inquiryId, listingId, receiverId, listingTitle, senderName } = d;
        if (!receiverId) return;
        await this.notificationsService.create({
          userId: receiverId,
          type: NotificationType.SYSTEM,
          titleAr: 'استفسار جديد على إعلانك',
          titleEn: 'New Listing Inquiry',
          bodyAr: `${senderName ?? 'مستخدم'} أرسل استفساراً بخصوص "${listingTitle ?? 'إعلانك'}"`,
          bodyEn: `${senderName ?? 'A user'} sent an inquiry about "${listingTitle ?? 'your listing'}"`,
          data: {
            inquiryId,
            listingId,
            path: `/marketplace/inquiries?tab=received&focus=${inquiryId ?? ''}`,
          },
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.LISTING_INQUIRY_REPLIED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as Record<string, string>;
        const { inquiryId, listingId, senderId, listingTitle } = d;
        if (!senderId) return;
        await this.notificationsService.create({
          userId: senderId,
          type: NotificationType.SYSTEM,
          titleAr: 'تم الرد على استفسارك',
          titleEn: 'Your Inquiry Was Replied To',
          bodyAr: `تم الرد على استفسارك بخصوص "${listingTitle ?? 'الإعلان'}"`,
          bodyEn: `A reply was sent to your inquiry about "${listingTitle ?? 'the listing'}"`,
          data: {
            inquiryId,
            listingId,
            path: `/marketplace/inquiries?tab=sent&focus=${inquiryId ?? ''}`,
          },
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_REQUESTED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as BookingEventPayload;
        const [touristName] = await this.getUserNames([d.touristUserId]);
        const packageTitle = d.packageTitleAr || d.packageTitleEn || '';
        const { guideUserId, bookingId } = d;
        const notifications = [
          this.notificationsService.create({
            userId: d.touristUserId,
            type: NotificationType.BOOKING_REQUESTED,
            titleAr: 'تم إرسال طلب الحجز',
            titleEn: 'Booking Request Sent',
            bodyAr: `تم إرسال طلب حجز "${packageTitle}" بنجاح`,
            bodyEn: `Your booking request for "${packageTitle}" was sent successfully`,
            data: { bookingId, path: '/bookings' },
          }),
        ];
        if (guideUserId) {
          notifications.push(
            this.notificationsService.create({
              userId: guideUserId,
              type: NotificationType.BOOKING_REQUESTED,
              titleAr: 'طلب حجز جديد',
              titleEn: 'New Booking Request',
              bodyAr: `${touristName ?? 'سائح'} طلب حجز "${packageTitle}"`,
              bodyEn: `${touristName ?? 'A tourist'} requested booking "${packageTitle}"`,
              data: { bookingId, path: '/bookings' },
            }),
          );
        }
        await Promise.all(notifications);
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_CONFIRMED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as BookingEventPayload;
        const [guideName] = await this.getUserNames([d.guideUserId]);
        const packageTitle = d.packageTitleAr || d.packageTitleEn || '';
        const { touristUserId, bookingId } = d;
        if (!touristUserId) return;
        await this.notificationsService.create({
          userId: touristUserId,
          type: NotificationType.BOOKING_CONFIRMED,
          titleAr: 'تم تأكيد الحجز',
          titleEn: 'Booking Confirmed',
          bodyAr: `${guideName ?? 'المرشد'} أكد حجز "${packageTitle}"`,
          bodyEn: `${guideName ?? 'The guide'} confirmed your booking "${packageTitle}"`,
          data: { bookingId, path: '/bookings' },
        });
      },
    );

    await this.streams.subscribe(
      EVENTS.BOOKING_CANCELLED,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      async (msg) => {
        const d = msg.data as BookingCancelledEventPayload;
        const [cancelledByName] = await this.getUserNames([d.cancelledByUserId]);
        const { touristUserId, guideUserId, bookingId } = d;
        const body = d.cancellationReason ? `السبب: ${d.cancellationReason}` : '';
        for (const userId of [touristUserId, guideUserId]) {
          if (!userId) continue;
          await this.notificationsService.create({
            userId,
            type: NotificationType.BOOKING_CANCELLED,
            titleAr: 'تم إلغاء الحجز',
            titleEn: 'Booking Cancelled',
            bodyAr:
              `الحجز تم إلغاؤه بواسطة ${cancelledByName ?? d.cancelledByRole}. ${body}`.trim(),
            bodyEn:
              `Booking cancelled by ${cancelledByName ?? d.cancelledByRole}. ${d.cancellationReason ?? ''}`.trim(),
            data: {
              bookingId,
              cancelledBy: cancelledByName ?? d.cancelledByRole,
              reason: d.cancellationReason,
              path: '/bookings',
            },
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
            data: { bookingId, path: '/bookings' },
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

  private async getUserNames(userIds: string[]): Promise<(string | undefined)[]> {
    const users = await this.usersService.findPublicProfiles(userIds.filter(Boolean));
    const names = new Map(users.map((user) => [user.id, user.displayName ?? user.fullName]));
    return userIds.map((userId) => names.get(userId));
  }
}
