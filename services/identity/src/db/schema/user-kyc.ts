import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { kycDocTypeEnum, kycStatusEnum } from '../enums';
import { identitySchema } from '../schema';

import { users } from './users';

export const userKyc = identitySchema.table(
  'user_kyc',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    docType: kycDocTypeEnum('doc_type').notNull(),
    docUrl: text('doc_url').notNull(),
    status: kycStatusEnum().default('pending').notNull(),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_kyc_user').on(t.userId),
    index('idx_kyc_status').on(t.status, t.createdAt.asc()),
    uniqueIndex('idx_kyc_unique_pending')
      .on(t.userId, t.docType)
      .where(sql`${t.status} = 'pending'`),
  ],
);
