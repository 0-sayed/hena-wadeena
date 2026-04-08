import { generateId } from '@hena-wadeena/nest-common';
import { NvDistrict } from '@hena-wadeena/types';
import { date, geometry, index, integer, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

import { wellAreaEnum } from '../enums';
import { marketSchema } from '../schema';

export const wellLogs = marketSchema.table(
  'well_logs',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    farmerId: uuid('farmer_id').notNull(),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    area: wellAreaEnum('area').notNull().$type<NvDistrict>(),
    pumpHours: numeric('pump_hours', { precision: 6, scale: 2 }).notNull(),
    kwhConsumed: numeric('kwh_consumed', { precision: 8, scale: 2 }).notNull(),
    costPiasters: integer('cost_piasters').notNull(),
    waterM3Est: numeric('water_m3_est', { precision: 8, scale: 2 }),
    depthToWaterM: numeric('depth_to_water_m', { precision: 6, scale: 1 }),
    loggedAt: date('logged_at').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_well_logs_farmer_id').on(t.farmerId),
    index('idx_well_logs_area').on(t.area),
    index('idx_well_logs_logged_at').on(t.loggedAt),
  ],
);
