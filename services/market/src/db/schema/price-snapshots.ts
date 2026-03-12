import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, date, index, integer, text, unique, uuid } from 'drizzle-orm/pg-core';

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
    check('chk_price_snapshots_avg_non_neg', sql`${t.avgPrice} >= 0`),
    check('chk_price_snapshots_min_non_neg', sql`${t.minPrice} >= 0`),
    check('chk_price_snapshots_max_non_neg', sql`${t.maxPrice} >= 0`),
    check('chk_price_snapshots_min_lte_max', sql`${t.minPrice} <= ${t.maxPrice}`),
    check(
      'chk_price_snapshots_avg_in_range',
      sql`${t.avgPrice} BETWEEN ${t.minPrice} AND ${t.maxPrice}`,
    ),
    check('chk_price_snapshots_sample_non_neg', sql`${t.sampleCount} >= 0`),
  ],
);
