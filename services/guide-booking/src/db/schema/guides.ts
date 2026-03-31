import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { guideBookingSchema } from '../schema';

export const guides = guideBookingSchema.table(
  'guides',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id').notNull(),
    bioAr: text('bio_ar'),
    bioEn: text('bio_en'),
    languages: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    specialties: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    profileImage: text('profile_image'),
    coverImage: text('cover_image'),
    areasOfOperation: text('areas_of_operation')
      .array()
      .notNull()
      .default(sql`'{}'`),
    licenseNumber: text('license_number').notNull(),
    licenseVerified: boolean('license_verified').default(false).notNull(),
    basePrice: integer('base_price').notNull(),
    ratingAvg: real('rating_avg').default(0),
    ratingCount: integer('rating_count').default(0).notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    searchVector: text('search_vector'),
  },
  (t) => [
    uniqueIndex('uq_guides_user_id')
      .on(t.userId)
      .where(sql`${t.deletedAt} IS NULL`),
    uniqueIndex('uq_guides_license_number')
      .on(t.licenseNumber)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_guides_active').on(t.active),
    index('idx_guides_created_at').on(t.createdAt.desc()),
    index('idx_guides_languages').using('gin', t.languages),
    index('idx_guides_specialties').using('gin', t.specialties),
    index('idx_guides_areas_of_operation').using('gin', t.areasOfOperation),
    check('chk_guides_base_price_non_neg', sql`${t.basePrice} >= 0`),
    check('chk_guides_rating_count_non_neg', sql`${t.ratingCount} >= 0`),
    check(
      'chk_guides_rating_range',
      sql`${t.ratingAvg} IS NULL OR (${t.ratingAvg} >= 0 AND ${t.ratingAvg} <= 5)`,
    ),
  ],
);
