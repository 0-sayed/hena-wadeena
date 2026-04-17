import { relations } from 'drizzle-orm';
import { boolean, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { craftTypeEnum } from '../enums';
import { marketSchema } from '../schema';

import { artisanProfiles } from './artisan-profiles';
import { wholesaleInquiries } from './wholesale-inquiries';

export const artisanProducts = marketSchema.table(
  'artisan_products',
  {
    id: uuid('id').primaryKey(),
    artisanId: uuid('artisan_id')
      .notNull()
      .references(() => artisanProfiles.id),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en'),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    craftType: craftTypeEnum('craft_type').notNull(),
    price: integer('price'),
    minOrderQty: integer('min_order_qty').notNull().default(1),
    imageKeys: text('image_keys').array().notNull().default([]),
    qrCodeKey: text('qr_code_key'),
    available: boolean('available').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('artisan_products_artisan_id_idx').on(table.artisanId),
    index('artisan_products_craft_type_idx').on(table.craftType),
    index('artisan_products_available_idx').on(table.available),
    index('artisan_products_created_at_idx').on(table.createdAt),
  ],
);

export const artisanProductsRelations = relations(artisanProducts, ({ one, many }) => ({
  artisan: one(artisanProfiles, {
    fields: [artisanProducts.artisanId],
    references: [artisanProfiles.id],
  }),
  inquiries: many(wholesaleInquiries),
}));
