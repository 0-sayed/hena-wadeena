import type { JwtPayload } from '@hena-wadeena/nest-common';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WalletService } from '../wallet/wallet.service';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController wallet routes', () => {
  let controller: UsersController;
  let mockUsersService: {
    findById: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    findPublicProfiles: ReturnType<typeof vi.fn>;
  };
  let mockWalletService: {
    getWalletSnapshot: ReturnType<typeof vi.fn>;
    topUp: ReturnType<typeof vi.fn>;
    deduct: ReturnType<typeof vi.fn>;
  };

  const currentUser: JwtPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    role: 'tourist',
    lang: 'en',
    jti: 'jti-1',
  };

  beforeEach(() => {
    mockUsersService = {
      findById: vi.fn(),
      updateProfile: vi.fn(),
      findPublicProfiles: vi.fn().mockResolvedValue([]),
    };
    mockWalletService = {
      getWalletSnapshot: vi.fn().mockResolvedValue({
        balancePiasters: 5000,
        recentTransactions: [],
      }),
      topUp: vi.fn().mockResolvedValue(7500),
      deduct: vi.fn().mockResolvedValue(2500),
    };

    controller = new UsersController(
      mockUsersService as unknown as UsersService,
      mockWalletService as unknown as WalletService,
    );
  });

  it('declares the wallet top-up route', () => {
    const topUp = Object.getOwnPropertyDescriptor(UsersController.prototype, 'topUp')?.value;

    expect(Reflect.getMetadata(PATH_METADATA, topUp)).toBe('wallet/topup');
    expect(Reflect.getMetadata(METHOD_METADATA, topUp)).toBe(RequestMethod.POST);
  });

  it('returns the current user wallet snapshot', async () => {
    const result = await controller.getWallet(currentUser);

    expect(mockWalletService.getWalletSnapshot).toHaveBeenCalledWith(currentUser.sub);
    expect(result).toEqual({
      success: true,
      data: {
        id: `wallet-${currentUser.sub}`,
        user_id: currentUser.sub,
        balance: 5000,
        currency: 'EGP',
        recent_transactions: [],
      },
    });
  });

  it('tops up the current user wallet', async () => {
    const result = await controller.topUp(currentUser, { amount: 2500, idempotency_key: 'idem-1' });

    expect(mockWalletService.topUp).toHaveBeenCalledWith(currentUser.sub, 2500, 'idem-1');
    expect(result).toEqual({ success: true, data: { balance: 7500 } });
  });
});
