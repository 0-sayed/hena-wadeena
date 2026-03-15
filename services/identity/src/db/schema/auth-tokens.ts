import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { identitySchema } from '../schema';

import { users } from './users';

export const authTokens = identitySchema.table(
  'auth_tokens',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    family: uuid().notNull(),
    deviceInfo: text('device_info'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_auth_tokens_token_hash').on(t.tokenHash),
    index('idx_auth_tokens_user_active')
      .on(t.userId)
      .where(sql`${t.revokedAt} IS NULL`),
    index('idx_auth_tokens_family').on(t.family),
  ],
);
