import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { CarpoolStatus, PoiStatus } from '@hena-wadeena/types';
import { Inject, Injectable } from '@nestjs/common';
import { count, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { carpoolRides } from '../db/schema/carpool-rides';
import { pointsOfInterest } from '../db/schema/points-of-interest';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getStats() {
    const [[poiStats], [rideStats]] = await Promise.all([
      this.db
        .select({
          total: count(),
          approved: count(
            sql`CASE WHEN ${pointsOfInterest.status} = ${PoiStatus.APPROVED} THEN 1 END`,
          ),
          pending: count(
            sql`CASE WHEN ${pointsOfInterest.status} = ${PoiStatus.PENDING} THEN 1 END`,
          ),
          rejected: count(
            sql`CASE WHEN ${pointsOfInterest.status} = ${PoiStatus.REJECTED} THEN 1 END`,
          ),
        })
        .from(pointsOfInterest)
        .where(sql`${pointsOfInterest.deletedAt} IS NULL`),
      this.db
        .select({
          total: count(),
          open: count(sql`CASE WHEN ${carpoolRides.status} = ${CarpoolStatus.OPEN} THEN 1 END`),
          full: count(sql`CASE WHEN ${carpoolRides.status} = ${CarpoolStatus.FULL} THEN 1 END`),
          departed: count(
            sql`CASE WHEN ${carpoolRides.status} = ${CarpoolStatus.DEPARTED} THEN 1 END`,
          ),
          completed: count(
            sql`CASE WHEN ${carpoolRides.status} = ${CarpoolStatus.COMPLETED} THEN 1 END`,
          ),
          cancelled: count(
            sql`CASE WHEN ${carpoolRides.status} = ${CarpoolStatus.CANCELLED} THEN 1 END`,
          ),
        })
        .from(carpoolRides),
    ]);

    return {
      pois: poiStats,
      carpoolRides: rideStats,
    };
  }
}
