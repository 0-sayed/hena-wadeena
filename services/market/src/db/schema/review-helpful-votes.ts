import { generateId } from '@hena-wadeena/nest-common';
import { timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { marketSchema } from '../schema';

import { reviews } from './reviews';

export const reviewHelpfulVotes = marketSchema.table(
  'review_helpful_votes',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('review_helpful_votes_user_review_unique').on(t.userId, t.reviewId)],
);
