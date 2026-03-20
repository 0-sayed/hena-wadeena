import { primaryKey, uuid } from 'drizzle-orm/pg-core';

import { marketSchema } from '../schema';

export const businessCommodities = marketSchema.table(
  'business_commodities',
  {
    businessId: uuid('business_id').notNull(),
    commodityId: uuid('commodity_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.commodityId] })],
);
