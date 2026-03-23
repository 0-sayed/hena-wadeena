import { primaryKey, uuid } from 'drizzle-orm/pg-core';

import { marketSchema } from '../schema';

import { businessDirectories } from './business-directories';
import { commodities } from './commodities';

export const businessCommodities = marketSchema.table(
  'business_commodities',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessDirectories.id),
    commodityId: uuid('commodity_id')
      .notNull()
      .references(() => commodities.id),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.commodityId] })],
);
