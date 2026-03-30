import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { BookingStatus } from '@hena-wadeena/types';
import { Inject, Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { bookings } from '../db/schema/bookings';
import { guides } from '../db/schema/guides';
import { guideReviews } from '../db/schema/reviews';
import { tourPackages } from '../db/schema/tour-packages';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats() {
    const [[guideStats], [packageStats], [bookingStats], [reviewStats]] = await Promise.all([
      this.db
        .select({
          total: count(),
          verified: count(sql`CASE WHEN ${guides.licenseVerified} = true THEN 1 END`),
          active: count(sql`CASE WHEN ${guides.active} = true THEN 1 END`),
        })
        .from(guides)
        .where(sql`${guides.deletedAt} IS NULL`),
      this.db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${tourPackages.status} = 'active' THEN 1 END`),
        })
        .from(tourPackages)
        .where(sql`${tourPackages.deletedAt} IS NULL`),
      this.db
        .select({
          total: count(),
          pending: count(sql`CASE WHEN ${bookings.status} = ${BookingStatus.PENDING} THEN 1 END`),
          confirmed: count(
            sql`CASE WHEN ${bookings.status} = ${BookingStatus.CONFIRMED} THEN 1 END`,
          ),
          inProgress: count(
            sql`CASE WHEN ${bookings.status} = ${BookingStatus.IN_PROGRESS} THEN 1 END`,
          ),
          completed: count(
            sql`CASE WHEN ${bookings.status} = ${BookingStatus.COMPLETED} THEN 1 END`,
          ),
          cancelled: count(
            sql`CASE WHEN ${bookings.status} = ${BookingStatus.CANCELLED} THEN 1 END`,
          ),
        })
        .from(bookings),
      this.db
        .select({
          total: count(),
          averageRating: sql<number>`COALESCE(ROUND(AVG(${guideReviews.rating})::numeric, 1), 0)::float`,
        })
        .from(guideReviews)
        .where(eq(guideReviews.isActive, true)),
    ]);

    return {
      guides: guideStats,
      packages: packageStats,
      bookings: bookingStats,
      reviews: { total: reviewStats?.total ?? 0, averageRating: reviewStats?.averageRating ?? 0 },
    };
  }
}
