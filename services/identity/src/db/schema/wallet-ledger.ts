import { generateId } from '@hena-wadeena/nest-common';
import {
  check,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { walletLedgerDirectionEnum, walletLedgerKindEnum } from '../enums';
import { identitySchema } from '../schema';

import { users } from './users';

export const walletLedger = identitySchema.table(
  'wallet_ledger',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id').notNull(),
    direction: walletLedgerDirectionEnum('direction').notNull(),
    amountPiasters: integer('amount_piasters').notNull(),
    kind: walletLedgerKindEnum('kind').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('wallet_ledger_idempotency_key_unique').on(t.idempotencyKey),
    index('idx_wallet_ledger_user_created_at').on(t.userId, t.createdAt.desc()),
    index('idx_wallet_ledger_booking_id').on(t.bookingId),
    index('idx_wallet_ledger_kind').on(t.kind),
    index('idx_wallet_ledger_user_booking').on(t.userId, t.bookingId),
    check('chk_wallet_ledger_amount_positive', sql`${t.amountPiasters} > 0`),
  ],
);
