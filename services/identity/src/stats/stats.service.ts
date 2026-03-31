import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { count, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { userKyc } from '../db/schema/user-kyc';
import { users } from '../db/schema/users';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      [statusStats],
      roleStats,
      [newUsersStats],
      [kycStats],
    ] = await Promise.all([
      // User counts by status
      this.db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${users.status} = 'active' THEN 1 END`),
          suspended: count(sql`CASE WHEN ${users.status} = 'suspended' THEN 1 END`),
          banned: count(sql`CASE WHEN ${users.status} = 'banned' THEN 1 END`),
        })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL`),

      // User counts by role
      this.db
        .select({
          role: users.role,
          count: count(),
        })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL`)
        .groupBy(users.role),

      // New users in last 30 days
      this.db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL AND ${users.createdAt} >= ${thirtyDaysAgo}`),

      // KYC stats
      this.db
        .select({
          total: count(),
          pending: count(sql`CASE WHEN ${userKyc.status} = 'pending' THEN 1 END`),
          underReview: count(sql`CASE WHEN ${userKyc.status} = 'under_review' THEN 1 END`),
          approved: count(sql`CASE WHEN ${userKyc.status} = 'approved' THEN 1 END`),
          rejected: count(sql`CASE WHEN ${userKyc.status} = 'rejected' THEN 1 END`),
        })
        .from(userKyc),
    ]);

    const byRole: Record<string, number> = {};
    for (const row of roleStats) {
      byRole[row.role] = row.count;
    }

    return {
      users: {
        total: statusStats?.total ?? 0,
        byStatus: {
          active: statusStats?.active ?? 0,
          suspended: statusStats?.suspended ?? 0,
          banned: statusStats?.banned ?? 0,
        },
        byRole,
        newLast30Days: newUsersStats?.count ?? 0,
      },
      kyc: {
        total: kycStats?.total ?? 0,
        pending: kycStats?.pending ?? 0,
        underReview: kycStats?.underReview ?? 0,
        approved: kycStats?.approved ?? 0,
        rejected: kycStats?.rejected ?? 0,
      },
    };
  }
}
