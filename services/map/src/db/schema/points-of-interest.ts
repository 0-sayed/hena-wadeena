import { generateId } from '@hena-wadeena/nest-common';
import { SQL, sql } from 'drizzle-orm';
import { check, geometry, index, integer, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { poiCategoryEnum, poiStatusEnum } from '../enums';
import { mapSchema } from '../schema';

import { tsvector } from './types';

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
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('simple', map.normalize_arabic(coalesce(${pointsOfInterest.nameAr}, ''))), 'A') || setweight(to_tsvector('simple', coalesce(${pointsOfInterest.nameEn}, '')), 'A') || setweight(to_tsvector('simple', map.normalize_arabic(coalesce(${pointsOfInterest.description}, ''))), 'B') || setweight(to_tsvector('simple', map.normalize_arabic(coalesce(${pointsOfInterest.address}, ''))), 'B')`,
    ),
  },
  (t) => [
    index('idx_pois_location').using('gist', t.location),
    index('idx_pois_category').on(t.category),
    index('idx_pois_status').on(t.status),
    index('idx_pois_submitted_by').on(t.submittedBy),
    index('idx_pois_created_at').on(t.createdAt.desc()),
    index('idx_pois_search').using('gin', t.searchVector),
    check('chk_pois_rating_count_non_neg', sql`${t.ratingCount} >= 0`),
    check(
      'chk_pois_rating_range',
      sql`${t.ratingAvg} IS NULL OR (${t.ratingAvg} >= 0 AND ${t.ratingAvg} <= 5)`,
    ),
  ],
);
