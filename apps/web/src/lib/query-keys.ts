export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    publicProfiles: (ids: string[]) => ['users', 'public-profiles', ids] as const,
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
    listingInquiries: () => ['market', 'listing-inquiries'] as const,
    listingInquiriesReceived: (filters?: Record<string, unknown>) =>
      ['market', 'listing-inquiries', 'received', filters] as const,
    listingInquiriesSent: (filters?: Record<string, unknown>) =>
      ['market', 'listing-inquiries', 'sent', filters] as const,
    businessInquiries: () => ['market', 'business-inquiries'] as const,
    businessInquiriesReceived: (filters?: Record<string, unknown>) =>
      ['market', 'business-inquiries', 'received', filters] as const,
    businessInquiriesSent: (filters?: Record<string, unknown>) =>
      ['market', 'business-inquiries', 'sent', filters] as const,
    priceIndex: (filters?: Record<string, unknown>) => ['market', 'price-index', filters] as const,
    priceSummary: () => ['market', 'price-summary'] as const,
    priceHistory: (id: string, params?: Record<string, unknown>) =>
      ['market', 'commodities', id, 'price-history', params] as const,
    businesses: (filters?: Record<string, unknown>) => ['market', 'businesses', filters] as const,
    business: (id: string) => ['market', 'businesses', id] as const,
    priceAlerts: (userId?: string) => ['market', 'price-alerts', userId] as const,
  },
  bookings: {
    mine: (filters?: Record<string, unknown>) =>
      filters !== undefined
        ? (['bookings', 'mine', filters] as const)
        : (['bookings', 'mine'] as const),
  },
  reviews: {
    guide: (guideId: string) => ['reviews', 'guide', guideId] as const,
    mine: () => ['reviews', 'mine'] as const,
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
    myRides: () => ['map', 'my-rides'] as const,
    statusBoard: (page: number, search?: string, status?: string) =>
      ['map', 'status-board', page, search ?? '', status ?? ''] as const,
  },
  search: {
    results: (query: string, filters?: Record<string, unknown>) =>
      ['search', query, filters] as const,
  },
  ai: {
    sessions: () => ['ai', 'sessions'] as const,
    session: (id: string) => ['ai', 'sessions', id] as const,
  },
  benefits: {
    all: () => ['benefits'] as const,
    detail: (slug: string) => ['benefits', slug] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    listingsAll: () => ['admin', 'listings'] as const,
    listings: (filters?: {
      page?: number;
      limit?: number;
      status?: string;
      is_verified?: boolean;
      owner_id?: string;
      category?: string;
      category_ne?: string;
      sort?: string;
    }) => [...queryKeys.admin.listingsAll(), filters] as const,
    users: (filters?: {
      role?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => ['admin', 'users', filters] as const,
    user: (id: string) => ['admin', 'users', id] as const,
    kyc: (filters?: { status?: string; page?: number; limit?: number }) =>
      ['admin', 'kyc', filters] as const,
    pendingListings: (filters?: { page?: number; limit?: number }) =>
      ['admin', 'moderation', 'listings', filters] as const,
    pendingBusinesses: (filters?: { page?: number; limit?: number }) =>
      ['admin', 'moderation', 'businesses', filters] as const,
    guides: (filters?: {
      status?: string;
      verified?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }) => ['admin', 'guides', filters] as const,
    bookings: (filters?: { status?: string; guideId?: string; page?: number; limit?: number }) =>
      ['admin', 'bookings', filters] as const,
    pendingPois: (filters?: { page?: number; limit?: number }) =>
      ['admin', 'pois', filters] as const,
    aiDocuments: (filters?: {
      page?: number;
      per_page?: number;
      status?: string;
      language?: string;
      tags?: string;
    }) => ['admin', 'ai', 'documents', filters] as const,
    aiBatch: (batchId: string) => ['admin', 'ai', 'batches', batchId] as const,
  },
  jobs: {
    all: (filters?: Record<string, unknown>) => ['jobs', filters] as const,
    detail: (id: string) => ['jobs', id] as const,
    applications: (jobId: string) => ['jobs', jobId, 'applications'] as const,
    myApplications: () => ['jobs', 'my-applications'] as const,
    myPosts: () => ['jobs', 'my-posts'] as const,
    reviews: () => ['jobs', 'reviews'] as const,
    userReviews: (userId: string) => ['jobs', 'reviews', userId] as const,
  },
  desertTrips: {
    byBooking: (bookingId: string) => ['desert-trips', 'booking', bookingId] as const,
  },
  home: {
    stats: () => ['home', 'stats'] as const,
  },
  wellLogs: {
    summary: () => ['market', 'well-logs', 'summary'] as const,
    list: (filters?: Record<string, unknown>) => ['market', 'well-logs', 'list', filters] as const,
  },
  news: {
    lists: () => ['news'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.news.lists(), filters] as const,
    detail: (slug: string) => ['news', slug] as const,
    adminList: (filters: Record<string, unknown>) => ['news', 'admin', filters] as const,
  },
};
