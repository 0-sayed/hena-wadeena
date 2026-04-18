import { beforeEach, describe, expect, it, vi } from 'vitest';

const paymentsAPI = vi.hoisted(() => ({
  getWallet: vi.fn(),
  topUp: vi.fn(),
  deduct: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  paymentsAPI,
}));

import { getWalletSnapshot, topUpWallet } from '../wallet-store';

describe('wallet-store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns booking transactions from the backend wallet snapshot', async () => {
    const bookingTransaction = {
      id: 'booking-tx-1',
      type: 'booking_debit',
      amount: 170000,
      direction: 'debit',
      balance_after: null,
      description: 'booking_debit',
      status: 'completed',
      created_at: '2026-04-03T12:00:00.000Z',
      reference_id: 'booking-1',
      reference_type: 'booking',
    };

    paymentsAPI.getWallet.mockResolvedValue({
      success: true,
      data: {
        id: 'wallet-user-1',
        user_id: 'user-1',
        balance: 30000,
        currency: 'EGP',
        recent_transactions: [bookingTransaction],
      },
    });

    const snapshot = await getWalletSnapshot('user-1');

    expect(snapshot.wallet.balance).toBe(30000);
    expect(snapshot.transactions).toEqual([bookingTransaction]);
    expect(snapshot.wallet.recent_transactions).toEqual([bookingTransaction]);
  });

  it('uses the caller-provided idempotency key when topping up the wallet', async () => {
    paymentsAPI.topUp.mockResolvedValue({
      success: true,
      data: { balance: 32500 },
    });
    paymentsAPI.getWallet.mockResolvedValue({
      success: true,
      data: {
        id: 'wallet-user-1',
        user_id: 'user-1',
        balance: 32500,
        currency: 'EGP',
        recent_transactions: [],
      },
    });

    await topUpWallet('user-1', 2500, 'wallet:topup:user-1:intent-1');

    expect(paymentsAPI.topUp).toHaveBeenCalledWith({
      amount: 2500,
      idempotency_key: 'wallet:topup:user-1:intent-1',
    });
  });
});
