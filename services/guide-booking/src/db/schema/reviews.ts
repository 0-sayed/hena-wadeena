import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { guideBookingSchema } from '../schema';

import { bookings } from './bookings';
import { guides } from './guides';

export const guideReviews = guideBookingSchema.table(
  'guide_reviews',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guides.id),
    reviewerId: uuid('reviewer_id').notNull(),
    rating: integer().notNull(),
    title: text(),
    comment: text(),
    guideReply: text('guide_reply'),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    images: text().array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_guide_reviews_booking_id').on(t.bookingId),
    index('idx_guide_reviews_guide_id').on(t.guideId),
    index('idx_guide_reviews_reviewer_id').on(t.reviewerId),
    index('idx_guide_reviews_rating').on(t.rating),
    index('idx_guide_reviews_created_at').on(t.createdAt.desc()),
    check('chk_guide_reviews_rating_range', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
);
