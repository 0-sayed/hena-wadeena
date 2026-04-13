import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { compensationTypeEnum, jobCategoryEnum, jobStatusEnum } from '../enums';
import { marketSchema } from '../schema';

export const jobPosts = marketSchema.table(
  'job_posts',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    posterId: uuid('poster_id').notNull(),
    title: text().notNull(),
    descriptionAr: text('description_ar').notNull(),
    descriptionEn: text('description_en'),
    category: jobCategoryEnum().notNull(),
    area: text().notNull(),
    compensation: integer().notNull(),
    compensationType: compensationTypeEnum('compensation_type').notNull(),
    slots: integer().default(1).notNull(),
    status: jobStatusEnum().default('open').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    check('job_posts_compensation_non_negative', sql`${t.compensation} >= 0`),
    check('job_posts_slots_positive', sql`${t.slots} >= 1`),
    index('idx_job_posts_poster_id').on(t.posterId),
    index('idx_job_posts_status').on(t.status),
    index('idx_job_posts_category').on(t.category),
    index('idx_job_posts_area').on(t.area),
    index('idx_job_posts_created_at').on(t.createdAt.desc()),
  ],
);
