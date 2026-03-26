import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, date, index, integer, text, time, timestamp, uuid } from 'drizzle-orm/pg-core';

import { bookingStatusEnum } from '../enums';
import { guideBookingSchema } from '../schema';

import { guides } from './guides';
import { tourPackages } from './tour-packages';

export const bookings = guideBookingSchema.table(
  'bookings',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    packageId: uuid('package_id')
      .notNull()
      .references(() => tourPackages.id),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guides.id),
    touristId: uuid('tourist_id').notNull(),
    bookingDate: date('booking_date').notNull(),
    startTime: time('start_time').notNull(),
    peopleCount: integer('people_count').notNull(),
    totalPrice: integer('total_price').notNull(),
    status: bookingStatusEnum().notNull().default('pending'),
    notes: text(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_bookings_package_id').on(t.packageId),
    index('idx_bookings_guide_id').on(t.guideId),
    index('idx_bookings_tourist_id').on(t.touristId),
    index('idx_bookings_status').on(t.status),
    index('idx_bookings_booking_date').on(t.bookingDate),
    index('idx_bookings_created_at').on(t.createdAt.desc()),
    check('chk_bookings_total_price_non_neg', sql`${t.totalPrice} >= 0`),
    check('chk_bookings_people_count_positive', sql`${t.peopleCount} >= 1`),
  ],
);
