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

  it('market.listingInquiries returns the shared base key', () => {
    expect(queryKeys.market.listingInquiries()).toEqual(['market', 'listing-inquiries']);
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

  it('bookings.mine returns stable key', () => {
    expect(queryKeys.bookings.mine()).toEqual(['bookings', 'mine']);
  });

  it('incidents.mine returns the base key when no filters are provided', () => {
    expect(queryKeys.incidents.mine()).toEqual(['incidents', 'mine']);
  });

  it('incidents.list returns the base key when no filters are provided', () => {
    expect(queryKeys.incidents.list()).toEqual(['incidents', 'list']);
  });

  it('incidents.list includes filters when provided', () => {
    expect(queryKeys.incidents.list({ limit: 100, status: 'reported' })).toEqual([
      'incidents',
      'list',
      { limit: 100, status: 'reported' },
    ]);
  });

  it('incidents.mine includes filters when provided', () => {
    expect(queryKeys.incidents.mine({ page: 2, limit: 10 })).toEqual([
      'incidents',
      'mine',
      { page: 2, limit: 10 },
    ]);
  });

  it('market.priceHistory includes id and params in key', () => {
    const params = { period: '30d', region: 'kharga' };
    expect(queryKeys.market.priceHistory('uuid-123', params)).toEqual([
      'market',
      'commodities',
      'uuid-123',
      'price-history',
      { period: '30d', region: 'kharga' },
    ]);
  });

  it('market.priceHistory with no params includes undefined', () => {
    expect(queryKeys.market.priceHistory('uuid-123')).toEqual([
      'market',
      'commodities',
      'uuid-123',
      'price-history',
      undefined,
    ]);
  });

  it('jobs.all without filters includes undefined', () => {
    expect(queryKeys.jobs.all()).toEqual(['jobs', undefined]);
  });

  it('jobs.all with filters includes them', () => {
    expect(queryKeys.jobs.all({ category: 'agriculture' })).toEqual([
      'jobs',
      { category: 'agriculture' },
    ]);
  });

  it('jobs.detail includes id', () => {
    expect(queryKeys.jobs.detail('job-1')).toEqual(['jobs', 'job-1']);
  });

  it('jobs.applications includes jobId', () => {
    expect(queryKeys.jobs.applications('job-1')).toEqual(['jobs', 'job-1', 'applications']);
  });

  it('jobs.myApplications returns stable key', () => {
    expect(queryKeys.jobs.myApplications()).toEqual(['jobs', 'my-applications']);
  });

  it('jobs.myPosts returns stable key', () => {
    expect(queryKeys.jobs.myPosts()).toEqual(['jobs', 'my-posts']);
  });

  it('jobs.userReviews includes userId', () => {
    expect(queryKeys.jobs.userReviews('user-1')).toEqual(['jobs', 'reviews', 'user-1']);
  });
});
