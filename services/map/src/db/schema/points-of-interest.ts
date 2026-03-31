import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, geometry, index, integer, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { poiCategoryEnum, poiStatusEnum } from '../enums';
import { mapSchema } from '../schema';

export const pointsOfInterest = mapSchema.table(
  'points_of_interest',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en'),
    description: text(),
    category: poiCategoryEnum().notNull(),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    address: text(),
    phone: text(),
    website: text(),
    images: text().array(),
    ratingAvg: real('rating_avg').default(0),
    ratingCount: integer('rating_count').default(0).notNull(),
    status: poiStatusEnum().notNull().default('pending'),
    submittedBy: uuid('submitted_by').notNull(),
    approvedBy: uuid('approved_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    searchVector: text('search_vector'),
  },
  (t) => [
    index('idx_pois_location').using('gist', t.location),
    index('idx_pois_category').on(t.category),
    index('idx_pois_status').on(t.status),
    index('idx_pois_submitted_by').on(t.submittedBy),
    index('idx_pois_created_at').on(t.createdAt.desc()),
    check('chk_pois_rating_count_non_neg', sql`${t.ratingCount} >= 0`),
    check(
      'chk_pois_rating_range',
      sql`${t.ratingAvg} IS NULL OR (${t.ratingAvg} >= 0 AND ${t.ratingAvg} <= 5)`,
    ),
  ],
);
