import { generateId } from '@hena-wadeena/nest-common';
import { sql } from 'drizzle-orm';
import { check, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { walletLedgerDirectionEnum, walletLedgerRefTypeEnum } from '../enums';
import { identitySchema } from '../schema';

import { users } from './users';

export const walletLedger = identitySchema.table(
  'wallet_ledger',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    refId: uuid('ref_id'),
    direction: walletLedgerDirectionEnum('direction').notNull(),
    amountPiasters: integer('amount_piasters').notNull(),
    refType: walletLedgerRefTypeEnum('ref_type').notNull(),
    noteAr: text('note_ar'),
    idempotencyKey: text('idempotency_key').notNull(),
    balanceAfterPiasters: integer('balance_after_piasters'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('wallet_ledger_idempotency_key_unique').on(t.idempotencyKey),
    index('idx_wallet_ledger_user_created_at').on(t.userId, t.createdAt.desc()),
    index('idx_wallet_ledger_ref_id').on(t.refId),
    index('idx_wallet_ledger_ref_type').on(t.refType),
    check('chk_wallet_ledger_amount_positive', sql`${t.amountPiasters} > 0`),
  ],
);
