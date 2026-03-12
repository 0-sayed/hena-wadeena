import { generateId } from '@hena-wadeena/nest-common';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { investmentSectorEnum, opportunityStatusEnum } from '../enums';
import { marketSchema } from '../schema';

export const investmentOpportunities = marketSchema.table(
  'investment_opportunities',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    ownerId: uuid('owner_id').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en'),
    description: text(),
    sector: investmentSectorEnum().notNull(),
    area: text(),
    landAreaSqm: real('land_area_sqm'),
    minInvestment: integer('min_investment').notNull(),
    maxInvestment: integer('max_investment').notNull(),
    currency: text().default('EGP'),
    expectedReturnPct: real('expected_return_pct'),
    paybackPeriodYears: real('payback_period_years'),
    incentives: text().array(),
    infrastructure: jsonb(),
    contact: jsonb(),
    documents: text().array(),
    images: text().array(),
    status: opportunityStatusEnum().default('draft').notNull(),
    source: text(),
    expiresAt: date('expires_at'),
    isVerified: boolean('is_verified').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    interestCount: integer('interest_count').default(0).notNull(),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_opportunities_status').on(t.status),
    index('idx_opportunities_sector').on(t.sector),
    index('idx_opportunities_owner_id').on(t.ownerId),
  ],
);
