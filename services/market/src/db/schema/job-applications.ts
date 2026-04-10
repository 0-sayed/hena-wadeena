import { generateId } from '@hena-wadeena/nest-common';
import { index, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { jobApplicationStatusEnum } from '../enums';
import { marketSchema } from '../schema';

import { jobPosts } from './job-posts';

export const jobApplications = marketSchema.table(
  'job_applications',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobPosts.id, { onDelete: 'cascade' }),
    applicantId: uuid('applicant_id').notNull(),
    noteAr: text('note_ar'),
    status: jobApplicationStatusEnum().default('pending').notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('job_applications_applicant_job_unique').on(t.applicantId, t.jobId),
    index('idx_job_applications_job_id').on(t.jobId),
    index('idx_job_applications_applicant_id').on(t.applicantId),
    index('idx_job_applications_status').on(t.status),
    index('idx_job_applications_applied_at').on(t.appliedAt.desc()),
  ],
);
