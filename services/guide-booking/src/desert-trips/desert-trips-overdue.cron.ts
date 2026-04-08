import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import type { DesertTripOverdueEventPayload } from '@hena-wadeena/types';
import { EVENTS } from '@hena-wadeena/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { bookings, desertTrips, guides } from '../db/schema/index';

@Injectable()
export class DesertTripsOverdueCron {
  private readonly logger = new Logger(DesertTripsOverdueCron.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  @Cron('*/15 * * * *')
  async checkOverdueTrips(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago

    const overdueTrips = await this.fetchOverdue(cutoff);
    if (overdueTrips.length === 0) return;

    this.logger.warn(`Found ${overdueTrips.length} overdue desert trip(s)`);

    await this.db
      .update(desertTrips)
      .set({ status: 'overdue', alertTriggeredAt: now })
      .where(
        inArray(
          desertTrips.id,
          overdueTrips.map((t) => t.id),
        ),
      );

    await Promise.all(
      overdueTrips.map((trip) =>
        this.redisStreams.publish(EVENTS.DESERT_TRIP_OVERDUE, {
          tripId: trip.id,
          bookingId: trip.bookingId,
          guideUserId: trip.guideUserId,
          touristUserId: trip.touristId,
          emergencyContact: trip.emergencyContact,
          destinationName: trip.destinationName,
        } satisfies DesertTripOverdueEventPayload),
      ),
    );

    await this.db
      .update(desertTrips)
      .set({ status: 'alert_sent' })
      .where(
        inArray(
          desertTrips.id,
          overdueTrips.map((t) => t.id),
        ),
      );
  }

  private fetchOverdue(cutoff: Date) {
    return this.db
      .select({
        id: desertTrips.id,
        bookingId: desertTrips.bookingId,
        destinationName: desertTrips.destinationName,
        emergencyContact: desertTrips.emergencyContact,
        touristId: bookings.touristId,
        guideUserId: guides.userId,
      })
      .from(desertTrips)
      .innerJoin(bookings, eq(desertTrips.bookingId, bookings.id))
      .innerJoin(guides, eq(bookings.guideId, guides.id))
      .where(
        and(
          eq(desertTrips.status, 'pending'),
          lt(desertTrips.expectedArrivalAt, cutoff),
          isNull(desertTrips.alertTriggeredAt),
        ),
      );
  }
}
