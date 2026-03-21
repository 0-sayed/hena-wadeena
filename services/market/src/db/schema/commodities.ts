import { generateId } from '@hena-wadeena/nest-common';
import { boolean, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { commodityCategoryEnum, commodityUnitEnum } from '../enums';
import { marketSchema } from '../schema';

export const commodities = marketSchema.table(
  'commodities',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en'),
    category: commodityCategoryEnum().notNull(),
    unit: commodityUnitEnum().notNull(),
    iconUrl: text('icon_url'),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_commodities_category').on(t.category),
    index('idx_commodities_is_active').on(t.isActive),
  ],
);
