import { generateId } from '@hena-wadeena/nest-common';
import { index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { otpPurposeEnum } from '../enums';
import { identitySchema } from '../schema';

export const otpCodes = identitySchema.table(
  'otp_codes',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    target: text().notNull(),
    purpose: otpPurposeEnum().notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    attempts: integer().default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_otp_codes_target_purpose').on(t.target, t.purpose)],
);
