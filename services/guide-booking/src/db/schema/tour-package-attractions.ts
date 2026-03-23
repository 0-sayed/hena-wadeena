import { index, integer, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { guideBookingSchema } from '../schema';

import { attractions } from './attractions';
import { tourPackages } from './tour-packages';

export const tourPackageAttractions = guideBookingSchema.table(
  'tour_package_attractions',
  {
    packageId: uuid('package_id')
      .notNull()
      .references(() => tourPackages.id),
    attractionId: uuid('attraction_id')
      .notNull()
      .references(() => attractions.id),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.packageId, t.attractionId] }),
    index('idx_tpa_attraction_id').on(t.attractionId),
  ],
);
