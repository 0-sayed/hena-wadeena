// services/market/src/admin/admin.service.ts
import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { businessDirectories } from '../db/schema/business-directories';
import { commodities } from '../db/schema/commodities';
import { commodityPrices } from '../db/schema/commodity-prices';
import { investmentApplications } from '../db/schema/investment-applications';
import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { listings } from '../db/schema/listings';
import { reviews } from '../db/schema/reviews';

import type {
  AdminStatsDto,
  BusinessModerationItem,
  InvestmentModerationItem,
  ModerationItem,
  ModerationQueueDto,
} from './dto/admin-stats.dto';

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats(): Promise<AdminStatsDto> {
    const [
      listingStatusCounts,
      [verifiedCount],
      [featuredCount],
      [reviewStats],
      [opportunityCount],
      applicationStatusCounts,
      businessVerifiedCounts,
      [commodityStats],
    ] = await Promise.all([
      // Listing counts by status
      this.db
        .select({
          status: listings.status,
          count: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(isNull(listings.deletedAt))
        .groupBy(listings.status)
        .orderBy(listings.status),
      // Verified listings count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.isVerified, true))
        .orderBy(sql`1`),
      // Featured listings count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.isFeatured, true))
        .orderBy(sql`1`),
      // Review stats
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          averageRating: sql<number>`coalesce(avg(${reviews.rating})::numeric(2,1), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.isActive, true))
        .orderBy(sql`1`),
      // Opportunity count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentOpportunities)
        .orderBy(sql`1`),
      // Application counts by status
      this.db
        .select({
          status: investmentApplications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(investmentApplications)
        .groupBy(investmentApplications.status)
        .orderBy(investmentApplications.status),
      // Business verified counts
      this.db
        .select({
          verificationStatus: businessDirectories.verificationStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(businessDirectories)
        .where(isNull(businessDirectories.deletedAt))
        .groupBy(businessDirectories.verificationStatus)
        .orderBy(businessDirectories.verificationStatus),
      // Commodity stats
      this.db
        .select({
          commodities: sql<number>`(SELECT count(*)::int FROM ${commodities} WHERE ${commodities.isActive} = true)`,
          prices: sql<number>`count(*)::int`,
        })
        .from(commodityPrices)
        .orderBy(sql`1`),
    ]);

    // Aggregate listing stats
    const listingStats = {
      total: 0,
      draft: 0,
      active: 0,
      suspended: 0,
      verified: verifiedCount?.count ?? 0,
      featured: featuredCount?.count ?? 0,
    };
    for (const row of listingStatusCounts) {
      listingStats.total += row.count;
      if (row.status === 'draft') listingStats.draft = row.count;
      if (row.status === 'active') listingStats.active = row.count;
      if (row.status === 'suspended') listingStats.suspended = row.count;
    }

    // Aggregate application stats
    const applicationStats = { total: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
    for (const row of applicationStatusCounts) {
      applicationStats.total += row.count;
      if (row.status === 'pending') applicationStats.pending = row.count;
      if (row.status === 'reviewed') applicationStats.reviewed = row.count;
      if (row.status === 'accepted') applicationStats.accepted = row.count;
      if (row.status === 'rejected') applicationStats.rejected = row.count;
    }

    // Aggregate business stats
    const businessStats = { total: 0, verified: 0, pending: 0 };
    for (const row of businessVerifiedCounts) {
      businessStats.total += row.count;
      if (row.verificationStatus === 'verified') businessStats.verified = row.count;
      else businessStats.pending += row.count;
    }

    return {
      listings: listingStats,
      reviews: {
        total: reviewStats?.total ?? 0,
        averageRating: reviewStats?.averageRating ?? 0,
      },
      investments: {
        opportunities: opportunityCount?.count ?? 0,
        applications: applicationStats,
      },
      businesses: businessStats,
      commodities: {
        total: commodityStats?.commodities ?? 0,
        activePrices: commodityStats?.prices ?? 0,
      },
    };
  }

  async getModerationQueue(): Promise<ModerationQueueDto> {
    const [
      draftListings,
      [listingCount],
      unverifiedBusinesses,
      [businessCount],
      reviewOpportunities,
      [opportunityCount],
    ] = await Promise.all([
      // Draft listings (limit 10)
      this.db
        .select({
          id: listings.id,
          titleAr: listings.titleAr,
          titleEn: listings.titleEn,
          ownerId: listings.ownerId,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(eq(listings.status, 'draft'))
        .limit(10)
        .orderBy(listings.createdAt),
      // Draft listings count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(eq(listings.status, 'draft'))
        .orderBy(sql`1`),
      // Unverified businesses (limit 10)
      this.db
        .select({
          id: businessDirectories.id,
          nameAr: businessDirectories.nameAr,
          nameEn: businessDirectories.nameEn,
          ownerId: businessDirectories.ownerId,
          createdAt: businessDirectories.createdAt,
        })
        .from(businessDirectories)
        .where(eq(businessDirectories.verificationStatus, 'pending'))
        .limit(10)
        .orderBy(businessDirectories.createdAt),
      // Unverified businesses count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(businessDirectories)
        .where(eq(businessDirectories.verificationStatus, 'pending'))
        .orderBy(sql`1`),
      // Review-status opportunities (limit 10)
      this.db
        .select({
          id: investmentOpportunities.id,
          titleAr: investmentOpportunities.titleAr,
          titleEn: investmentOpportunities.titleEn,
          sector: investmentOpportunities.sector,
          ownerId: investmentOpportunities.ownerId,
          createdAt: investmentOpportunities.createdAt,
        })
        .from(investmentOpportunities)
        .where(eq(investmentOpportunities.status, 'review'))
        .limit(10)
        .orderBy(investmentOpportunities.createdAt),
      // Review-status opportunities count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentOpportunities)
        .where(eq(investmentOpportunities.status, 'review'))
        .orderBy(sql`1`),
    ]);

    const listingItems: ModerationItem[] = draftListings.map((l) => ({
      id: l.id,
      titleAr: l.titleAr,
      titleEn: l.titleEn,
      ownerId: l.ownerId,
      createdAt: l.createdAt.toISOString(),
    }));

    const businessItems: BusinessModerationItem[] = unverifiedBusinesses.map((b) => ({
      id: b.id,
      nameAr: b.nameAr,
      nameEn: b.nameEn,
      ownerId: b.ownerId,
      createdAt: b.createdAt.toISOString(),
    }));

    const investmentItems: InvestmentModerationItem[] = reviewOpportunities.map((o) => ({
      id: o.id,
      titleAr: o.titleAr,
      titleEn: o.titleEn,
      sector: o.sector,
      ownerId: o.ownerId,
      createdAt: o.createdAt.toISOString(),
    }));

    const listingsCount = listingCount?.count ?? 0;
    const businessesCount = businessCount?.count ?? 0;
    const opportunitiesCount = opportunityCount?.count ?? 0;

    return {
      listings: { count: listingsCount, items: listingItems },
      businesses: { count: businessesCount, items: businessItems },
      investments: { count: opportunitiesCount, items: investmentItems },
      totalPending: listingsCount + businessesCount + opportunitiesCount,
    };
  }
}
