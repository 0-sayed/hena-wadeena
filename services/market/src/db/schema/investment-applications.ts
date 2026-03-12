import { generateId } from '@hena-wadeena/nest-common';
import { index, integer, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { applicationStatusEnum } from '../enums';
import { marketSchema } from '../schema';

import { investmentOpportunities } from './investment-opportunities';

export const investmentApplications = marketSchema.table(
  'investment_applications',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => investmentOpportunities.id),
    investorId: uuid('investor_id').notNull(),
    amountProposed: integer('amount_proposed'),
    message: text(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    documents: text().array(),
    status: applicationStatusEnum().default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('applications_investor_opportunity_unique').on(t.investorId, t.opportunityId),
    index('idx_applications_opportunity_id').on(t.opportunityId),
    index('idx_applications_investor_id').on(t.investorId),
    index('idx_applications_status').on(t.status),
  ],
);
