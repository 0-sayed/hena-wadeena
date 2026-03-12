import { generateId } from '@hena-wadeena/nest-common';
import { date, index, integer, text, unique, uuid } from 'drizzle-orm/pg-core';

import { listingTypeEnum } from '../enums';
import { marketSchema } from '../schema';

export const priceSnapshots = marketSchema.table(
  'price_snapshots',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    district: text().notNull(),
    listingType: listingTypeEnum('listing_type').notNull(),
    avgPrice: integer('avg_price').notNull(),
    minPrice: integer('min_price').notNull(),
    maxPrice: integer('max_price').notNull(),
    sampleCount: integer('sample_count').notNull(),
    snapshotDate: date('snapshot_date').notNull(),
  },
  (t) => [
    unique('price_snapshots_district_type_date_unique').on(
      t.district,
      t.listingType,
      t.snapshotDate,
    ),
    index('idx_price_snapshots_date').on(t.snapshotDate.desc()),
    index('idx_price_snapshots_district_type').on(t.district, t.listingType),
  ],
);
