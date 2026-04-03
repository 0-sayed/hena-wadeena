import { beforeEach, describe, expect, it, vi } from 'vitest';

const paymentsAPI = vi.hoisted(() => ({
  getWallet: vi.fn(),
  topUp: vi.fn(),
  deduct: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  paymentsAPI,
}));

import { getWalletSnapshot } from '../wallet-store';

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
});
