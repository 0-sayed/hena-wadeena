import { NotificationType, type NotificationListResponse } from '@hena-wadeena/types';
import { describe, expect, it } from 'vitest';

import { markAllNotificationsAsRead, markNotificationAsRead } from './notifications-cache';

const baseResponse: NotificationListResponse = {
  data: [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      titleAr: 'عنوان أول',
      titleEn: 'First title',
      bodyAr: 'رسالة أولى',
      bodyEn: 'First body',
      data: null,
      readAt: null,
      createdAt: '2026-04-08T09:00:00.000Z',
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: NotificationType.BOOKING_CONFIRMED,
      titleAr: 'عنوان ثان',
      titleEn: 'Second title',
      bodyAr: 'رسالة ثانية',
      bodyEn: 'Second body',
      data: null,
      readAt: null,
      createdAt: '2026-04-08T10:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  hasMore: false,
  unreadCount: 2,
};

describe('notifications cache helpers', () => {
  it('marks a single notification as read without removing it from the list', () => {
    const updated = markNotificationAsRead(baseResponse, 'notif-1', '2026-04-08T11:00:00.000Z');

    expect(updated?.data).toHaveLength(2);
    expect(updated?.data[0]?.readAt).toBe('2026-04-08T11:00:00.000Z');
    expect(updated?.data[1]?.readAt).toBeNull();
    expect(updated?.unreadCount).toBe(1);
  });

  it('marks all notifications as read while keeping every record visible', () => {
    const updated = markAllNotificationsAsRead(baseResponse, '2026-04-08T11:05:00.000Z');

    expect(updated?.data).toHaveLength(2);
    expect(
      updated?.data.every((notification) => notification.readAt === '2026-04-08T11:05:00.000Z'),
    ).toBe(true);
    expect(updated?.unreadCount).toBe(0);
  });
});
