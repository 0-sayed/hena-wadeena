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

import { marketSchema } from '../schema';

import { listings } from './listings';

export const reviews = marketSchema.table(
  'reviews',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    reviewerId: uuid('reviewer_id').notNull(),
    rating: integer().notNull(),
    title: text(),
    comment: text(),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    isVerifiedVisit: boolean('is_verified_visit').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    images: text().array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('rating_range', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
    uniqueIndex('reviews_reviewer_listing_active_unique')
      .on(t.reviewerId, t.listingId)
      .where(sql`${t.isActive} = true`),
    index('idx_reviews_listing_id').on(t.listingId),
    index('idx_reviews_reviewer_id').on(t.reviewerId),
    index('idx_reviews_created_at').on(t.createdAt.desc()),
  ],
);
