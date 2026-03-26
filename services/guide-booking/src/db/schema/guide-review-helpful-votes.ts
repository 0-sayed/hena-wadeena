import { generateId } from '@hena-wadeena/nest-common';
import { timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { guideBookingSchema } from '../schema';

import { guideReviews } from './reviews';

export const guideReviewHelpfulVotes = guideBookingSchema.table(
  'guide_review_helpful_votes',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => guideReviews.id),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('guide_review_helpful_votes_user_review_unique').on(t.userId, t.reviewId)],
);
