import { generateId } from '@hena-wadeena/nest-common';
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { auditEventTypeEnum } from '../enums';
import { identitySchema } from '../schema';

import { users } from './users';

export const auditEvents = identitySchema.table(
  'audit_events',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id').references(() => users.id),
    eventType: auditEventTypeEnum('event_type').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_audit_events_user_created').on(t.userId, t.createdAt.desc()),
    index('idx_audit_events_type_created').on(t.eventType, t.createdAt.desc()),
  ],
);
