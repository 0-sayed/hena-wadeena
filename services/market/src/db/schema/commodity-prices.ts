import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { priceTypeEnum } from '../enums';
import { marketSchema } from '../schema';

export const commodityPrices = marketSchema.table(
  'commodity_prices',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    commodityId: uuid('commodity_id').notNull(),
    price: integer().notNull(),
    priceType: priceTypeEnum('price_type').notNull(),
    region: text().notNull(),
    source: text(),
    notes: text(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    recordedBy: uuid('recorded_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_commodity_prices_commodity_date').on(t.commodityId, t.recordedAt.desc()),
    index('idx_commodity_prices_recorded_at').on(t.recordedAt.desc()),
    index('idx_commodity_prices_region').on(t.region),
    check('chk_commodity_price_non_neg', sql`${t.price} >= 0`),
  ],
);
