import { sql } from 'drizzle-orm';
import { check, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { reviewDirectionEnum } from '../enums';
import { marketSchema } from '../schema';

import { jobApplications } from './job-applications';
import { jobPosts } from './job-posts';

export const jobReviews = marketSchema.table(
  'job_reviews',
  {
    id: uuid().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobPosts.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => jobApplications.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id').notNull(),
    revieweeId: uuid('reviewee_id').notNull(),
    direction: reviewDirectionEnum().notNull(),
    rating: integer().notNull(),
    comment: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('job_reviews_rating_range', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
    uniqueIndex('job_reviews_application_direction_unique').on(t.applicationId, t.direction),
    index('idx_job_reviews_reviewer_id').on(t.reviewerId),
    index('idx_job_reviews_reviewee_id').on(t.revieweeId),
    index('idx_job_reviews_created_at').on(t.createdAt.desc()),
  ],
);
