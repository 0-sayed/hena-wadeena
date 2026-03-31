// services/market/src/admin/dto/admin-stats.dto.ts

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
