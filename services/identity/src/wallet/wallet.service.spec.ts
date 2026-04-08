import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach } from 'vitest';

import { createMockDb } from '../test-utils/create-mock-db';

import { WalletService } from './wallet.service';

const mockLedgerEntry = {
  id: 'ledger-uuid',
  userId: 'user-a',
  refId: 'ref-uuid',
  direction: 'debit' as const,
  amountPiasters: 500,
  refType: 'booking' as const,
  noteAr: null,
  idempotencyKey: 'booking:ref-uuid_debit',
  balanceAfterPiasters: 9500,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WalletService', () => {
  let service: WalletService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new WalletService(mockDb as any);
  });

  // ── applyWalletEntry ────────────────────────────────────────────────────────

  describe('applyWalletEntry', () => {
    it('returns "applied" and updates balance on first call', async () => {
      // ledger insert succeeds (non-empty returning)
      mockDb.returning.mockResolvedValueOnce([mockLedgerEntry]);
      // user balance update succeeds
      mockDb.returning.mockResolvedValueOnce([{ id: 'user-a', balancePiasters: 9500 }]);

      const result = await service.applyWalletEntry({
        refId: 'ref-uuid',
        userId: 'user-a',
        amountPiasters: 500,
        direction: 'debit',
        refType: 'booking',
        idempotencyKey: 'booking:ref-uuid_debit',
      });

      expect(result).toBe('applied');
    });

    it('returns "duplicate" when idempotency key already used', async () => {
      // onConflictDoNothing returns empty array (conflict)
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await service.applyWalletEntry({
        refId: 'ref-uuid',
        userId: 'user-a',
        amountPiasters: 500,
        direction: 'debit',
        refType: 'booking',
        idempotencyKey: 'booking:ref-uuid_debit',
      });

      expect(result).toBe('duplicate');
    });

    it('throws BadRequestException on debit when balance is insufficient', async () => {
      // ledger insert succeeds
      mockDb.returning.mockResolvedValueOnce([mockLedgerEntry]);
      // user balance update fails (balance check in WHERE excluded the row)
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.applyWalletEntry({
          refId: 'ref-uuid',
          userId: 'user-a',
          amountPiasters: 99999,
          direction: 'debit',
          refType: 'booking',
          idempotencyKey: 'booking:ref-uuid_debit',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── transfer ────────────────────────────────────────────────────────────────

  describe('transfer', () => {
    const transferDto = {
      fromUserId: 'user-a',
      toUserId: 'user-b',
      amountPiasters: 1000,
      refType: 'job' as const,
      refId: 'job-uuid',
      idempotencyKey: 'job:job-uuid',
    };

    it('throws BadRequestException when fromUserId === toUserId', async () => {
      await expect(service.transfer({ ...transferDto, toUserId: 'user-a' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns "duplicate" when idempotency key already used', async () => {
      // idempotency check returns existing row
      mockDb.limit.mockResolvedValueOnce([{ id: 'existing-ledger' }]);

      const result = await service.transfer(transferDto);
      expect(result).toEqual({ status: 'duplicate' });
    });

    it('returns "applied" with updated balances on successful transfer', async () => {
      // idempotency check: no existing row
      mockDb.limit.mockResolvedValueOnce([]);
      // deduct from sender: update returns new balance
      mockDb.returning.mockResolvedValueOnce([{ balancePiasters: 4000 }]);
      // credit to receiver: update returns new balance
      mockDb.returning.mockResolvedValueOnce([{ balancePiasters: 2000 }]);
      // insert two ledger rows: no return needed
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await service.transfer(transferDto);
      expect(result).toEqual({
        status: 'applied',
        fromBalancePiasters: 4000,
        toBalancePiasters: 2000,
      });
    });

    it('throws BadRequestException when sender has insufficient balance', async () => {
      // idempotency check: no existing row
      mockDb.limit.mockResolvedValueOnce([]);
      // deduct from sender: WHERE gte check fails, returns empty
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.transfer(transferDto)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when recipient does not exist', async () => {
      // idempotency check: no existing row
      mockDb.limit.mockResolvedValueOnce([]);
      // deduct from sender: succeeds
      mockDb.returning.mockResolvedValueOnce([{ balancePiasters: 4000 }]);
      // credit to receiver: user not found
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.transfer(transferDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getWalletSnapshot ───────────────────────────────────────────────────────

  describe('getWalletSnapshot', () => {
    it('returns balance and recent transactions', async () => {
      mockDb.limit.mockResolvedValueOnce([
        { id: 'user-a', balancePiasters: 5000, deletedAt: null },
      ]);
      mockDb.limit.mockResolvedValueOnce([mockLedgerEntry]);

      const snapshot = await service.getWalletSnapshot('user-a');
      expect(snapshot.balancePiasters).toBe(5000);
      expect(snapshot.recentTransactions).toHaveLength(1);
      expect(snapshot.recentTransactions[0]!.refType).toBe('booking');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.getWalletSnapshot('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
