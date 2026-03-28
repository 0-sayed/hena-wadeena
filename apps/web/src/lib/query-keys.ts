export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    lists: () => ['notifications', 'list'] as const,
    list: (filters: { page: number; limit: number; unreadOnly?: boolean }) =>
      [...queryKeys.notifications.lists(), filters] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  tourism: {
    attractions: (filters?: Record<string, unknown>) =>
      ['tourism', 'attractions', filters] as const,
    attraction: (slug: string) => ['tourism', 'attractions', slug] as const,
  },
  guides: {
    all: (filters?: Record<string, unknown>) => ['guides', filters] as const,
    detail: (id: string) => ['guides', id] as const,
    packages: (guideId: string) => ['guides', guideId, 'packages'] as const,
  },
  packages: {
    all: (filters?: Record<string, unknown>) => ['packages', filters] as const,
    detail: (id: string) => ['packages', id] as const,
  },
  market: {
    listings: (filters?: Record<string, unknown>) => ['market', 'listings', filters] as const,
    listing: (id: string) => ['market', 'listings', id] as const,
    priceIndex: (filters?: Record<string, unknown>) => ['market', 'price-index', filters] as const,
    priceSummary: () => ['market', 'price-summary'] as const,
    businesses: (filters?: Record<string, unknown>) => ['market', 'businesses', filters] as const,
    business: (id: string) => ['market', 'businesses', id] as const,
  },
  bookings: {
    mine: (filters?: Record<string, unknown>) =>
      filters !== undefined
        ? (['bookings', 'mine', filters] as const)
        : (['bookings', 'mine'] as const),
  },
  investment: {
    opportunities: (filters?: Record<string, unknown>) =>
      ['investment', 'opportunities', filters] as const,
    opportunity: (id: string) => ['investment', 'opportunities', id] as const,
  },
  map: {
    pois: (filters?: Record<string, unknown>) => ['map', 'pois', filters] as const,
    poi: (id: string) => ['map', 'pois', id] as const,
    carpool: (filters?: Record<string, unknown>) => ['map', 'carpool', filters] as const,
    ride: (id: string) => ['map', 'carpool', id] as const,
    myRides: () => ['map', 'carpool', 'my'] as const,
  },
  search: {
    results: (query: string, filters?: Record<string, unknown>) =>
      ['search', query, filters] as const,
  },
  ai: {
    sessions: () => ['ai', 'sessions'] as const,
    session: (id: string) => ['ai', 'sessions', id] as const,
  },
};
