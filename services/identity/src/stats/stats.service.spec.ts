import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(async () => {
    // Each select() call returns a separate chain with the right terminal method
    const usersStatusChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 100, active: 90, suspended: 8, banned: 2 }]),
    };
    const usersRoleChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { role: 'tourist', count: 50 },
        { role: 'merchant', count: 30 },
        { role: 'admin', count: 5 },
      ]),
    };
    const newUsersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 15 }]),
    };
    const kycChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue([{ total: 25, pending: 5, underReview: 0, approved: 18, rejected: 2 }]),
    };

    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(usersStatusChain)
        .mockReturnValueOnce(usersRoleChain)
        .mockReturnValueOnce(newUsersChain)
        .mockReturnValueOnce(kycChain),
    };

    const module = await Test.createTestingModule({
      providers: [StatsService, { provide: DRIZZLE_CLIENT, useValue: mockDb }],
    }).compile();

    service = module.get(StatsService);
  });

  it('should return stats with user and kyc counts', async () => {
    const result = await service.getStats();

    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('kyc');
    expect(result.users).toHaveProperty('total', 100);
    expect(result.users).toHaveProperty('byStatus');
    expect(result.users.byStatus).toEqual({ active: 90, suspended: 8, banned: 2 });
    expect(result.users).toHaveProperty('byRole');
    expect(result.users.byRole).toHaveProperty('tourist', 50);
    expect(result.users.newLast30Days).toBe(15);
    expect(result.kyc).toHaveProperty('pending', 5);
    expect(result.kyc).toHaveProperty('approved', 18);
  });
});
