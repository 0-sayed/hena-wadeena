import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { investmentApplications } from '../db/schema/investment-applications';
import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { listings } from '../db/schema/listings';
import { reviews } from '../db/schema/reviews';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats() {
    const [[listingStats], [investmentStats], [applicationStats], [reviewStats]] =
      await Promise.all([
        // Listing stats
        this.db
          .select({
            total: count(),
            verified: count(sql`CASE WHEN ${listings.isVerified} = true THEN 1 END`),
            unverified: count(sql`CASE WHEN ${listings.isVerified} = false THEN 1 END`),
            featured: count(sql`CASE WHEN ${listings.isFeatured} = true THEN 1 END`),
            draft: count(sql`CASE WHEN ${listings.status} = 'draft' THEN 1 END`),
            active: count(sql`CASE WHEN ${listings.status} = 'active' THEN 1 END`),
            suspended: count(sql`CASE WHEN ${listings.status} = 'suspended' THEN 1 END`),
          })
          .from(listings)
          .where(sql`${listings.deletedAt} IS NULL`),

        // Investment opportunity stats
        this.db
          .select({
            total: count(),
            draft: count(sql`CASE WHEN ${investmentOpportunities.status} = 'draft' THEN 1 END`),
            review: count(sql`CASE WHEN ${investmentOpportunities.status} = 'review' THEN 1 END`),
            active: count(sql`CASE WHEN ${investmentOpportunities.status} = 'active' THEN 1 END`),
            closed: count(sql`CASE WHEN ${investmentOpportunities.status} = 'closed' THEN 1 END`),
            taken: count(sql`CASE WHEN ${investmentOpportunities.status} = 'taken' THEN 1 END`),
            verified: count(sql`CASE WHEN ${investmentOpportunities.isVerified} = true THEN 1 END`),
          })
          .from(investmentOpportunities),

        // Total investment applications
        this.db.select({ total: count() }).from(investmentApplications),

        // Review stats
        this.db
          .select({
            total: count(),
            averageRating: sql<number>`COALESCE(ROUND(AVG(${reviews.rating})::numeric, 1), 0)::float`,
          })
          .from(reviews)
          .where(eq(reviews.isActive, true)),
      ]);

    return {
      listings: {
        total: listingStats?.total ?? 0,
        verified: listingStats?.verified ?? 0,
        unverified: listingStats?.unverified ?? 0,
        featured: listingStats?.featured ?? 0,
        byStatus: {
          draft: listingStats?.draft ?? 0,
          active: listingStats?.active ?? 0,
          suspended: listingStats?.suspended ?? 0,
        },
      },
      investments: {
        total: investmentStats?.total ?? 0,
        verified: investmentStats?.verified ?? 0,
        byStatus: {
          draft: investmentStats?.draft ?? 0,
          review: investmentStats?.review ?? 0,
          active: investmentStats?.active ?? 0,
          closed: investmentStats?.closed ?? 0,
          taken: investmentStats?.taken ?? 0,
        },
        totalApplications: applicationStats?.total ?? 0,
      },
      reviews: {
        total: reviewStats?.total ?? 0,
        averageRating: reviewStats?.averageRating ?? 0,
      },
    };
  }
}
