export interface AdminStatsResponse {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: {
      active: number;
      suspended: number;
      banned: number;
    };
    newLast30Days: number;
  };
  kyc: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
  listings: {
    total: number;
    verified: number;
    unverified: number;
    featured: number;
    byStatus: Record<string, number>;
  };
  investments: {
    total: number;
    verified: number;
    byStatus: Record<string, number>;
    totalApplications: number;
  };
  reviews: {
    listings: { total: number; averageRating: number };
    guides: { total: number; averageRating: number };
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  guides: {
    total: number;
    verified: number;
    active: number;
  };
  packages: {
    total: number;
    active: number;
  };
  pois: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  carpoolRides: {
    total: number;
    open: number;
    full: number;
    departed: number;
    completed: number;
    cancelled: number;
  };
  meta: {
    sources: string[];
    degraded: boolean;
    cachedAt: string | null;
  };
}
