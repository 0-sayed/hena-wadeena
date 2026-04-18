import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WalletPage from '../WalletPage';

const mockGetWalletSnapshot = vi.fn();
const mockTopUpWallet = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockRandomUuid = vi.fn();

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => null,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'resident@hena-wadeena.online',
    },
  }),
}));

vi.mock('@/lib/format', () => ({
  formatPrice: (value: number) => String(value),
}));

vi.mock('@/lib/wallet-store', () => ({
  getWalletSnapshot: (...args: unknown[]) => mockGetWalletSnapshot(...args),
  parseEgpInputToPiasters: (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount * 100 : null;
  },
  topUpWallet: (...args: unknown[]) => mockTopUpWallet(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('WalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWalletSnapshot.mockResolvedValue({
      wallet: {
        id: 'wallet-user-1',
        user_id: 'user-1',
        balance: 0,
        currency: 'EGP',
        recent_transactions: [],
      },
      transactions: [],
    });

    mockRandomUuid.mockReset();
    mockRandomUuid
      .mockReturnValueOnce('idem-1')
      .mockReturnValueOnce('idem-2')
      .mockReturnValueOnce('idem-3');
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => mockRandomUuid());
  });

  it('reuses the same idempotency key when the user retries the same top-up', async () => {
    mockTopUpWallet
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        wallet: {
          id: 'wallet-user-1',
          user_id: 'user-1',
          balance: 10000,
          currency: 'EGP',
          recent_transactions: [],
        },
        transactions: [],
      });

    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>,
    );

    await screen.findByText('الرصيد الحالي');

    fireEvent.click(screen.getByRole('button', { name: 'شحن المحفظة' }));
    fireEvent.change(screen.getByPlaceholderText('مبلغ آخر...'), {
      target: { value: '100' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'شحن الآن' }));

    await waitFor(() =>
      expect(mockTopUpWallet).toHaveBeenNthCalledWith(
        1,
        'user-1',
        10000,
        'wallet:topup:user-1:idem-1',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'شحن الآن' }));

    await waitFor(() =>
      expect(mockTopUpWallet).toHaveBeenNthCalledWith(
        2,
        'user-1',
        10000,
        'wallet:topup:user-1:idem-1',
      ),
    );

    expect(mockRandomUuid).toHaveBeenCalledTimes(1);
  });
});
