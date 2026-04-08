import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import type { WalletRefType, WalletSnapshot } from '@hena-wadeena/types';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../db/schema';
import { users } from '../db/schema/users';
import { walletLedger } from '../db/schema/wallet-ledger';

@Injectable()
export class WalletService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase<typeof schema>) {}

  async getBalance(userId: string): Promise<number> {
    const [user] = await this.db
      .select({ balancePiasters: users.balancePiasters })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    return user.balancePiasters;
  }

  async getWalletSnapshot(userId: string): Promise<WalletSnapshot> {
    const [[user], recentTransactions] = await Promise.all([
      this.db
        .select({ balancePiasters: users.balancePiasters })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1),
      this.db
        .select({
          id: walletLedger.id,
          direction: walletLedger.direction,
          amountPiasters: walletLedger.amountPiasters,
          balanceAfterPiasters: walletLedger.balanceAfterPiasters,
          refType: walletLedger.refType,
          refId: walletLedger.refId,
          noteAr: walletLedger.noteAr,
          createdAt: walletLedger.createdAt,
        })
        .from(walletLedger)
        .where(eq(walletLedger.userId, userId))
        .orderBy(desc(walletLedger.createdAt))
        .limit(20),
    ]);
    if (!user) throw new NotFoundException('User not found');

    return {
      balancePiasters: user.balancePiasters,
      recentTransactions: recentTransactions.map((row) => ({
        id: row.id,
        direction: row.direction,
        amountPiasters: row.amountPiasters,
        balanceAfterPiasters: row.balanceAfterPiasters,
        refType: row.refType,
        refId: row.refId ?? null,
        noteAr: row.noteAr ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async topUp(userId: string, amount: number, idempotencyKey: string): Promise<number> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({ balancePiasters: sql`${users.balancePiasters} + ${amount}`, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning({ balancePiasters: users.balancePiasters });
      if (!updated) throw new NotFoundException('User not found');

      await tx
        .insert(walletLedger)
        .values({
          userId,
          direction: 'credit',
          amountPiasters: amount,
          refType: 'topup',
          refId: null,
          idempotencyKey,
          balanceAfterPiasters: updated.balancePiasters,
        })
        .onConflictDoNothing({ target: walletLedger.idempotencyKey });

      return updated.balancePiasters;
    });
  }

  async deduct(userId: string, amount: number, idempotencyKey: string): Promise<number> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({ balancePiasters: sql`${users.balancePiasters} - ${amount}`, updatedAt: new Date() })
        .where(
          and(eq(users.id, userId), isNull(users.deletedAt), gte(users.balancePiasters, amount)),
        )
        .returning({ balancePiasters: users.balancePiasters });
      if (!updated) throw new BadRequestException('رصيد المحفظة غير كافٍ أو المستخدم غير موجود');

      await tx
        .insert(walletLedger)
        .values({
          userId,
          direction: 'debit',
          amountPiasters: amount,
          refType: 'deduction',
          refId: null,
          idempotencyKey,
          balanceAfterPiasters: updated.balancePiasters,
        })
        .onConflictDoNothing({ target: walletLedger.idempotencyKey });

      return updated.balancePiasters;
    });
  }

  async applyWalletEntry(entry: {
    refId: string | null;
    userId: string;
    amountPiasters: number;
    direction: 'credit' | 'debit';
    refType: WalletRefType;
    noteAr?: string;
    idempotencyKey: string;
  }): Promise<'applied' | 'duplicate'> {
    if (entry.amountPiasters <= 0) {
      throw new BadRequestException('Wallet entry amount must be positive');
    }

    return this.db.transaction(async (tx) => {
      const [ledgerRow] = await tx
        .insert(walletLedger)
        .values({
          userId: entry.userId,
          refId: entry.refId ?? null,
          direction: entry.direction,
          amountPiasters: entry.amountPiasters,
          refType: entry.refType,
          noteAr: entry.noteAr ?? null,
          idempotencyKey: entry.idempotencyKey,
        })
        .onConflictDoNothing({ target: walletLedger.idempotencyKey })
        .returning();

      if (!ledgerRow) return 'duplicate';

      const delta = entry.direction === 'credit' ? entry.amountPiasters : -entry.amountPiasters;

      const [updatedUser] = await tx
        .update(users)
        .set({ balancePiasters: sql`${users.balancePiasters} + ${delta}`, updatedAt: new Date() })
        .where(
          entry.direction === 'debit'
            ? and(
                eq(users.id, entry.userId),
                isNull(users.deletedAt),
                gte(users.balancePiasters, entry.amountPiasters),
              )
            : and(eq(users.id, entry.userId), isNull(users.deletedAt)),
        )
        .returning({ id: users.id, balancePiasters: users.balancePiasters });

      if (!updatedUser) {
        throw new BadRequestException(
          entry.direction === 'debit'
            ? 'رصيد المحفظة غير كافٍ أو المستخدم غير موجود'
            : 'المستخدم غير موجود',
        );
      }

      await tx
        .update(walletLedger)
        .set({ balanceAfterPiasters: updatedUser.balancePiasters })
        .where(eq(walletLedger.id, ledgerRow.id));

      return 'applied';
    });
  }

  async transfer(dto: {
    fromUserId: string;
    toUserId: string;
    amountPiasters: number;
    refType: WalletRefType;
    refId: string;
    noteAr?: string;
    idempotencyKey: string;
  }): Promise<{
    status: 'applied' | 'duplicate';
    fromBalancePiasters?: number;
    toBalancePiasters?: number;
  }> {
    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('Cannot transfer to self');
    }

    return this.db.transaction(async (tx) => {
      // Lock both rows in ascending ID order to prevent deadlocks under concurrent same-pair transfers.
      // Lock BEFORE the idempotency check so concurrent identical transfers serialize here,
      // making the SELECT + INSERT sequence atomic with respect to other transfers between the same pair.
      const [lockId1, lockId2] = [dto.fromUserId, dto.toUserId].sort();
      await tx.execute(
        sql`SELECT id FROM ${users} WHERE ${users.id} IN (${lockId1}, ${lockId2}) ORDER BY ${users.id} ASC FOR UPDATE`,
      );

      // Idempotency: check if debit row already exists (inside the lock scope)
      const [existing] = await tx
        .select({ id: walletLedger.id })
        .from(walletLedger)
        .where(eq(walletLedger.idempotencyKey, `${dto.idempotencyKey}_debit`))
        .limit(1);

      if (existing) return { status: 'duplicate' };

      // Debit sender (balance check in WHERE — atomic with update)
      const [updatedFrom] = await tx
        .update(users)
        .set({
          balancePiasters: sql`${users.balancePiasters} - ${dto.amountPiasters}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.id, dto.fromUserId),
            isNull(users.deletedAt),
            gte(users.balancePiasters, dto.amountPiasters),
          ),
        )
        .returning({ balancePiasters: users.balancePiasters });

      if (!updatedFrom)
        throw new BadRequestException('رصيد المحفظة غير كافٍ أو المستخدم غير موجود');

      // Credit receiver
      const [updatedTo] = await tx
        .update(users)
        .set({
          balancePiasters: sql`${users.balancePiasters} + ${dto.amountPiasters}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, dto.toUserId), isNull(users.deletedAt)))
        .returning({ balancePiasters: users.balancePiasters });

      if (!updatedTo) throw new NotFoundException('Recipient not found');

      // Two ledger rows — same refId, both directions
      await tx.insert(walletLedger).values([
        {
          userId: dto.fromUserId,
          direction: 'debit' as const,
          amountPiasters: dto.amountPiasters,
          refType: dto.refType,
          refId: dto.refId,
          noteAr: dto.noteAr ?? null,
          idempotencyKey: `${dto.idempotencyKey}_debit`,
          balanceAfterPiasters: updatedFrom.balancePiasters,
        },
        {
          userId: dto.toUserId,
          direction: 'credit' as const,
          amountPiasters: dto.amountPiasters,
          refType: dto.refType,
          refId: dto.refId,
          noteAr: dto.noteAr ?? null,
          idempotencyKey: `${dto.idempotencyKey}_credit`,
          balanceAfterPiasters: updatedTo.balancePiasters,
        },
      ]);

      return {
        status: 'applied',
        fromBalancePiasters: updatedFrom.balancePiasters,
        toBalancePiasters: updatedTo.balancePiasters,
      };
    });
  }
}
