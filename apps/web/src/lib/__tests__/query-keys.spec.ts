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

  it('market.priceIndex includes filters in key', () => {
    const filters = { region: 'kharga' };
    expect(queryKeys.market.priceIndex(filters)).toEqual([
      'market',
      'price-index',
      { region: 'kharga' },
    ]);
  });

  it('market.priceSummary returns stable key', () => {
    expect(queryKeys.market.priceSummary()).toEqual(['market', 'price-summary']);
  });

  it('market.businesses includes filters in key', () => {
    const filters = { district: 'dakhla' };
    expect(queryKeys.market.businesses(filters)).toEqual([
      'market',
      'businesses',
      { district: 'dakhla' },
    ]);
  });

  it('market.business includes id in key', () => {
    expect(queryKeys.market.business('uuid-123')).toEqual(['market', 'businesses', 'uuid-123']);
  });
});
