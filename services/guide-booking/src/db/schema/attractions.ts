import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  geometry,
  index,
  integer,
  jsonb,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  attractionAreaEnum,
  attractionTypeEnum,
  bestSeasonEnum,
  bestTimeOfDayEnum,
  difficultyEnum,
} from '../enums';
import { guideBookingSchema } from '../schema';

export const attractions = guideBookingSchema.table(
  'attractions',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en'),
    slug: text().notNull(),
    type: attractionTypeEnum('type').notNull(),
    area: attractionAreaEnum('area').notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    historyAr: text('history_ar'),
    bestSeason: bestSeasonEnum('best_season'),
    bestTimeOfDay: bestTimeOfDayEnum('best_time_of_day'),
    entryFee: jsonb('entry_fee'),
    openingHours: text('opening_hours'),
    durationHours: real('duration_hours'),
    difficulty: difficultyEnum('difficulty'),
    tips: text().array(),
    nearbySlugs: text('nearby_slugs').array(),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    images: text().array(),
    thumbnail: text(),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    ratingAvg: real('rating_avg'),
    reviewCount: integer('review_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    searchVector: text('search_vector'),
  },
  (t) => [
    uniqueIndex('attractions_slug_unique').on(t.slug),
    index('idx_attractions_location').using('gist', t.location),
    index('idx_attractions_type').on(t.type),
    index('idx_attractions_area').on(t.area),
    index('idx_attractions_is_active').on(t.isActive),
    index('idx_attractions_is_featured').on(t.isFeatured),
    index('idx_attractions_created_at').on(t.createdAt.desc()),
    check('chk_attractions_duration_positive', sql`${t.durationHours} > 0`),
    check('chk_attractions_review_count_non_neg', sql`${t.reviewCount} >= 0`),
    check(
      'chk_attractions_rating_avg_range',
      sql`${t.ratingAvg} IS NULL OR (${t.ratingAvg} >= 0 AND ${t.ratingAvg} <= 5)`,
    ),
  ],
);
