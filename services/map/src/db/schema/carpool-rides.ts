import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, geometry, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { carpoolRideStatusEnum } from '../enums';
import { mapSchema } from '../schema';

export const carpoolRides = mapSchema.table(
  'carpool_rides',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    driverId: uuid('driver_id').notNull(),
    origin: geometry('origin', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    destination: geometry('destination', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    originName: text('origin_name').notNull(),
    destinationName: text('destination_name').notNull(),
    departureTime: timestamp('departure_time', { withTimezone: true }).notNull(),
    seatsTotal: integer('seats_total').notNull(),
    seatsTaken: integer('seats_taken').default(0).notNull(),
    pricePerSeat: integer('price_per_seat').default(0).notNull(),
    notes: text(),
    status: carpoolRideStatusEnum().notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_carpool_rides_driver_id').on(t.driverId),
    index('idx_carpool_rides_status').on(t.status),
    index('idx_carpool_rides_departure_time').on(t.departureTime),
    index('idx_carpool_rides_origin').using('gist', t.origin),
    index('idx_carpool_rides_destination').using('gist', t.destination),
    check('chk_carpool_rides_seats_total_positive', sql`${t.seatsTotal} >= 1`),
    check(
      'chk_carpool_rides_seats_taken_valid',
      sql`${t.seatsTaken} >= 0 AND ${t.seatsTaken} <= ${t.seatsTotal}`,
    ),
    check('chk_carpool_rides_price_non_neg', sql`${t.pricePerSeat} >= 0`),
  ],
);
