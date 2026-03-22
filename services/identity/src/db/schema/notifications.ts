import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { notificationTypeEnum } from '../enums';
import { identitySchema } from '../schema';

import { users } from './users';

export const notifications = identitySchema.table(
  'notifications',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum().notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    bodyAr: text('body_ar').notNull(),
    bodyEn: text('body_en').notNull(),
    data: jsonb(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_notifications_user_created').on(t.userId, t.createdAt.desc()),
    index('idx_notifications_user_unread')
      .on(t.userId, t.createdAt.desc())
      .where(sql`${t.readAt} IS NULL`),
  ],
);
