import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, index, integer, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { packageStatusEnum } from '../enums';
import { guideBookingSchema } from '../schema';

import { guides } from './guides';

export const tourPackages = guideBookingSchema.table(
  'tour_packages',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guides.id),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en'),
    description: text(),
    durationHours: real('duration_hours').notNull(),
    maxPeople: integer('max_people').notNull(),
    price: integer().notNull(),
    includes: text().array(),
    images: text().array(),
    status: packageStatusEnum().notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_tour_packages_guide_id').on(t.guideId),
    index('idx_tour_packages_status').on(t.status),
    index('idx_tour_packages_created_at').on(t.createdAt.desc()),
    check('chk_tour_packages_price_positive', sql`${t.price} > 0`),
    check('chk_tour_packages_max_people_positive', sql`${t.maxPeople} >= 1`),
    check('chk_tour_packages_duration_positive', sql`${t.durationHours} > 0`),
  ],
);
