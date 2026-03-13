import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, index, integer, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { passengerStatusEnum } from '../enums';
import { mapSchema } from '../schema';

import { carpoolRides } from './carpool-rides';

export const carpoolPassengers = mapSchema.table(
  'carpool_passengers',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    rideId: uuid('ride_id')
      .notNull()
      .references(() => carpoolRides.id),
    userId: uuid('user_id').notNull(),
    seats: integer().default(1).notNull(),
    status: passengerStatusEnum().notNull().default('requested'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_carpool_passengers_ride_user').on(t.rideId, t.userId),
    index('idx_carpool_passengers_user_id').on(t.userId),
    index('idx_carpool_passengers_status').on(t.status),
    check('chk_carpool_passengers_seats_positive', sql`${t.seats} >= 1`),
  ],
);
