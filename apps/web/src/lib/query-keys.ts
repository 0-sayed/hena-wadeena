export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  tourism: {
    attractions: (filters?: Record<string, unknown>) =>
      ['tourism', 'attractions', filters] as const,
    attraction: (id: string) => ['tourism', 'attractions', id] as const,
  },
  guides: {
    all: (filters?: Record<string, unknown>) => ['guides', filters] as const,
    detail: (id: string) => ['guides', id] as const,
    packages: (guideId: string) => ['guides', guideId, 'packages'] as const,
  },
  market: {
    priceIndex: (filters?: Record<string, unknown>) => ['market', 'price-index', filters] as const,
    priceSummary: () => ['market', 'price-summary'] as const,
    businesses: (filters?: Record<string, unknown>) => ['market', 'businesses', filters] as const,
    business: (id: string) => ['market', 'businesses', id] as const,
  },
  investment: {
    opportunities: (filters?: Record<string, unknown>) =>
      ['investment', 'opportunities', filters] as const,
    opportunity: (id: string) => ['investment', 'opportunities', id] as const,
  },
  map: {
    pois: (filters?: Record<string, unknown>) => ['map', 'pois', filters] as const,
    carpool: (filters?: Record<string, unknown>) => ['map', 'carpool', filters] as const,
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
