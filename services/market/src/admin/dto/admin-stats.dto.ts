// services/market/src/admin/dto/admin-stats.dto.ts

// T30: Market-specific admin stats
export interface ListingStats {
  total: number;
  draft: number;
  active: number;
  suspended: number;
  verified: number;
  featured: number;
}

export interface ReviewStats {
  total: number;
  averageRating: number;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewed: number;
  accepted: number;
  rejected: number;
}

export interface InvestmentStats {
  opportunities: number;
  applications: ApplicationStats;
}

export interface BusinessStats {
  total: number;
  verified: number;
  pending: number;
}

export interface CommodityStats {
  total: number;
  activePrices: number;
}

export interface AdminStatsDto {
  listings: ListingStats;
  reviews: ReviewStats;
  investments: InvestmentStats;
  businesses: BusinessStats;
  commodities: CommodityStats;
}

export interface ModerationItem {
  id: string;
  titleAr: string;
  titleEn: string | null;
  ownerId: string;
  createdAt: string;
}

export interface BusinessModerationItem {
  id: string;
  nameAr: string;
  nameEn: string | null;
  ownerId: string;
  createdAt: string;
}

export interface InvestmentModerationItem extends ModerationItem {
  sector: string;
}

export interface ModerationQueueDto {
  listings: {
    count: number;
    items: ModerationItem[];
  };
  businesses: {
    count: number;
    items: BusinessModerationItem[];
  };
  investments: {
    count: number;
    items: InvestmentModerationItem[];
  };
  totalPending: number;
}

// T29: Cross-service aggregated stats
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
