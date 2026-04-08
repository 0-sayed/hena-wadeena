import { generateId } from '@hena-wadeena/nest-common';
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { siteStatusEnum } from '../enums';
import { mapSchema } from '../schema';

import { pointsOfInterest } from './points-of-interest';

export const siteStatusUpdates = mapSchema.table(
  'site_status_updates',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    poiId: uuid('poi_id')
      .notNull()
      .references(() => pointsOfInterest.id),
    stewardId: uuid('steward_id').notNull(),
    status: siteStatusEnum().notNull(),
    noteAr: text('note_ar'),
    noteEn: text('note_en'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_site_status_updates_poi_created').on(t.poiId, t.createdAt.desc())],
);
