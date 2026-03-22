import { describe, it, expect } from 'vitest';
import { queryKeys } from '../query-keys';

describe('queryKeys', () => {
  it('auth.me returns stable key', () => {
    expect(queryKeys.auth.me()).toEqual(['auth', 'me']);
  });

  it('notifications.unreadCount returns stable key', () => {
    expect(queryKeys.notifications.unreadCount()).toEqual(['notifications', 'unread-count']);
  });

  it('tourism.attractions includes filters in key', () => {
    const filters = { area: 'kharga' };
    expect(queryKeys.tourism.attractions(filters)).toEqual([
      'tourism',
      'attractions',
      { area: 'kharga' },
    ]);
  });

  it('tourism.attractions without filters includes undefined', () => {
    expect(queryKeys.tourism.attractions()).toEqual(['tourism', 'attractions', undefined]);
  });

  it('guides.detail includes id in key', () => {
    expect(queryKeys.guides.detail('abc-123')).toEqual(['guides', 'abc-123']);
  });

  it('market.businesses.mine returns stable key', () => {
    expect(queryKeys.market.businesses.mine()).toEqual(['market', 'businesses', 'mine']);
  });

  it('bookings.mine returns stable key', () => {
    expect(queryKeys.bookings.mine()).toEqual(['bookings', 'mine']);
  });
});
