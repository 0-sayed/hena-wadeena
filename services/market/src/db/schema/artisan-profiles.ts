import { relations, sql } from 'drizzle-orm';
import { index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { craftTypeEnum } from '../enums';
import { marketSchema } from '../schema';

import { artisanProducts } from './artisan-products';

export const artisanProfiles = marketSchema.table(
  'artisan_profiles',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en'),
    bioAr: text('bio_ar'),
    bioEn: text('bio_en'),
    craftTypes: craftTypeEnum('craft_types').array().notNull().default([]),
    area: text('area').notNull(),
    whatsapp: text('whatsapp').notNull(),
    profileImageKey: text('profile_image_key'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('artisan_profiles_user_id_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('artisan_profiles_area_idx').on(table.area),
    index('artisan_profiles_verified_at_idx').on(table.verifiedAt),
    index('artisan_profiles_craft_types_idx').using('gin', table.craftTypes),
  ],
);

export const artisanProfilesRelations = relations(artisanProfiles, ({ many }) => ({
  products: many(artisanProducts),
}));
