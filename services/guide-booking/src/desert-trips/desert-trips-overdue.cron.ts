import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import type { DesertTripOverdueEventPayload } from '@hena-wadeena/types';
import { EVENTS } from '@hena-wadeena/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray, isNull, lt, notInArray } from 'drizzle-orm';
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

    // Mark as overdue — state predicates make this atomic even under concurrent cron instances.
    // alertTriggeredAt is NOT set here; it is only set after successful publish below.
    await this.db
      .update(desertTrips)
      .set({ status: 'overdue' })
      .where(
        and(
          inArray(
            desertTrips.id,
            overdueTrips.map((t) => t.id),
          ),
          eq(desertTrips.status, 'pending'),
          isNull(desertTrips.alertTriggeredAt),
        ),
      );

    // Use allSettled so a single Redis failure doesn't block the rest.
    const results = await Promise.allSettled(
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

    const successfulIds = overdueTrips
      .filter((_, i) => results[i]?.status === 'fulfilled')
      .map((t) => t.id);

    if (successfulIds.length === 0) return;

    // Only mark alert_sent + stamp alertTriggeredAt for trips that were successfully published.
    // Trips where publish failed stay in 'overdue' with alertTriggeredAt = null and will be
    // retried by the next cron run (fetchOverdue includes overdue rows without alertTriggeredAt).
    await this.db
      .update(desertTrips)
      .set({ status: 'alert_sent', alertTriggeredAt: now })
      .where(and(inArray(desertTrips.id, successfulIds), eq(desertTrips.status, 'overdue')));
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
          // Include 'overdue' as well so trips that failed to publish on a prior run get retried.
          inArray(desertTrips.status, ['pending', 'overdue']),
          lt(desertTrips.expectedArrivalAt, cutoff),
          isNull(desertTrips.alertTriggeredAt),
          // Skip trips whose bookings are no longer active.
          notInArray(bookings.status, ['cancelled', 'completed']),
        ),
      );
  }
}
