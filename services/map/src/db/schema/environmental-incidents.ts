import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { geometry, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { incidentStatusEnum, incidentTypeEnum } from '../enums';
import { mapSchema } from '../schema';

export const environmentalIncidents = mapSchema.table(
  'environmental_incidents',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    reporterId: uuid('reporter_id').notNull(),
    incidentType: incidentTypeEnum('incident_type').notNull(),
    status: incidentStatusEnum().notNull().default('reported'),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    photos: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    eeaaReference: text('eeaa_reference'),
    adminNotes: text('admin_notes'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_incidents_status').on(t.status),
    index('idx_incidents_created_at').on(t.createdAt.desc()),
    index('idx_incidents_reporter').on(t.reporterId),
    index('idx_incidents_location').using('gist', t.location),
  ],
);
