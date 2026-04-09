import type { NotificationListResponse } from '@hena-wadeena/types';

function withReadTimestamp<T extends { readAt: string | null }>(item: T, readAt: string): T {
  if (item.readAt) {
    return item;
  }

  return {
    ...item,
    readAt,
  };
}

export function markNotificationAsRead(
  list: NotificationListResponse | undefined,
  notificationId: string,
  readAt = new Date().toISOString(),
): NotificationListResponse | undefined {
  if (!list) {
    return list;
  }

  let unreadDelta = 0;
  const data = list.data.map((notification) => {
    if (notification.id !== notificationId || notification.readAt) {
      return notification;
    }

    unreadDelta += 1;
    return withReadTimestamp(notification, readAt);
  });

  return {
    ...list,
    data,
    unreadCount: Math.max(0, list.unreadCount - unreadDelta),
  };
}

export function markAllNotificationsAsRead(
  list: NotificationListResponse | undefined,
  readAt = new Date().toISOString(),
): NotificationListResponse | undefined {
  if (!list) {
    return list;
  }

  return {
    ...list,
    data: list.data.map((notification) => withReadTimestamp(notification, readAt)),
    unreadCount: 0,
  };
}
