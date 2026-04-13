import { generateId } from '@hena-wadeena/nest-common';
import { index, jsonb, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { desertTripStatusEnum } from '../enums';
import { guideBookingSchema } from '../schema';

import { bookings } from './bookings';

export const desertTrips = guideBookingSchema.table(
  'desert_trips',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    expectedArrivalAt: timestamp('expected_arrival_at', { withTimezone: true }).notNull(),
    destinationName: text('destination_name').notNull(),
    emergencyContact: text('emergency_contact').notNull(),
    rangerStationName: text('ranger_station_name'), // free-text name; no cross-schema FK
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    alertTriggeredAt: timestamp('alert_triggered_at', { withTimezone: true }),
    gpsBreadcrumbs: jsonb('gps_breadcrumbs')
      .$type<{ lat: number; lng: number; ts: string }[]>()
      .default([])
      .notNull(),
    status: desertTripStatusEnum().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_desert_trips_booking_id').on(t.bookingId),
    index('idx_desert_trips_status_arrival').on(t.status, t.expectedArrivalAt),
  ],
);
