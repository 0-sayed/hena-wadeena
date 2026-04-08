import { generateId } from '@hena-wadeena/nest-common';
import { timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { mapSchema } from '../schema';

import { pointsOfInterest } from './points-of-interest';

export const siteStewards = mapSchema.table(
  'site_stewards',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    poiId: uuid('poi_id')
      .notNull()
      .references(() => pointsOfInterest.id),
    userId: uuid('user_id').notNull(),
    grantedBy: uuid('granted_by').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('uq_site_stewards_poi_user').on(t.poiId, t.userId)],
);
