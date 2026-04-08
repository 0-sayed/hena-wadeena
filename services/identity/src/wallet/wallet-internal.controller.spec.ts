import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { WalletInternalController } from './wallet-internal.controller';
import type { WalletService } from './wallet.service';

describe('WalletInternalController', () => {
  let controller: WalletInternalController;
  let mockWalletService: { transfer: ReturnType<typeof vi.fn> };

  const dto = {
    fromUserId: '00000000-0000-0000-0000-000000000001',
    toUserId: '00000000-0000-0000-0000-000000000002',
    amountPiasters: 1000,
    refType: 'job' as const,
    refId: '00000000-0000-0000-0000-000000000099',
    idempotencyKey: 'job:00000000-0000-0000-0000-000000000099',
  };

  beforeEach(() => {
    mockWalletService = { transfer: vi.fn() };
    controller = new WalletInternalController(mockWalletService as unknown as WalletService);
  });

  it('returns applied response on successful transfer', async () => {
    mockWalletService.transfer.mockResolvedValueOnce({
      status: 'applied',
      fromBalance: 4000,
      toBalance: 2000,
    });

    const result = await controller.transfer(dto as any);
    expect(result).toEqual({ status: 'applied', fromBalance: 4000, toBalance: 2000 });
    expect(mockWalletService.transfer).toHaveBeenCalledWith(dto);
  });

  it('returns duplicate response without calling service twice', async () => {
    mockWalletService.transfer.mockResolvedValueOnce({ status: 'duplicate' });

    const result = await controller.transfer(dto as any);
    expect(result).toEqual({ status: 'duplicate' });
  });

  it('propagates BadRequestException from service', async () => {
    mockWalletService.transfer.mockRejectedValueOnce(
      new BadRequestException('رصيد المحفظة غير كافٍ أو المستخدم غير موجود'),
    );

    await expect(controller.transfer(dto as any)).rejects.toThrow(BadRequestException);
  });

  it('propagates NotFoundException from service', async () => {
    mockWalletService.transfer.mockRejectedValueOnce(new NotFoundException('Recipient not found'));

    await expect(controller.transfer(dto as any)).rejects.toThrow(NotFoundException);
  });
});
