import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { userRoleEnum, userStatusEnum } from '../enums';
import { identitySchema } from '../schema';

export const users = identitySchema.table(
  'users',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    email: text().notNull(),
    phone: text(),
    fullName: text('full_name').notNull(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum().default('tourist').notNull(),
    status: userStatusEnum().default('active').notNull(),
    language: text().default('ar').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    uniqueIndex('users_phone_unique')
      .on(t.phone)
      .where(sql`${t.phone} IS NOT NULL`),
    index('idx_users_role').on(t.role),
    index('idx_users_status').on(t.status),
    index('idx_users_created_at').on(t.createdAt.desc()),
  ],
);
