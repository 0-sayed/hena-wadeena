import { beforeEach, describe, expect, it, vi } from 'vitest';

const { randomBytesMock } = vi.hoisted(() => ({
  randomBytesMock: vi.fn<(size: number) => Buffer>(),
}));

vi.mock('node:crypto', () => ({
  randomBytes: randomBytesMock,
}));

import { AdminUsersService } from './admin-users.service';

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let mockUsersService: {
    findByIdOrThrow: ReturnType<typeof vi.fn>;
    adminResetPassword: ReturnType<typeof vi.fn>;
  };
  let mockHashingService: {
    hash: ReturnType<typeof vi.fn>;
  };
  let mockKycService: {
    findByUser: ReturnType<typeof vi.fn>;
  };
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUsersService = {
      findByIdOrThrow: vi.fn().mockResolvedValue({ id: 'user-uuid' }),
      adminResetPassword: vi.fn().mockResolvedValue(undefined),
    };
    mockHashingService = {
      hash: vi.fn().mockImplementation((value: string) => Promise.resolve(`hashed:${value}`)),
    };
    mockKycService = {
      findByUser: vi.fn().mockResolvedValue([]),
    };
    mockDb = {
      select: vi.fn(),
    };

    service = new AdminUsersService(
      mockUsersService as never,
      mockHashingService as never,
      mockKycService as never,
      mockDb as never,
    );
  });

  it('skips biased bytes when generating temporary passwords', async () => {
    randomBytesMock.mockReturnValueOnce(
      Buffer.from([255, 254, 253, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    );

    const result = await service.resetPassword('user-uuid', 'admin-uuid');

    const expectedPassword = Array.from({ length: 12 }, (_, index) =>
      PASSWORD_ALPHABET.charAt(index),
    ).join('');

    expect(result.password).toBe(expectedPassword);
    expect(mockHashingService.hash).toHaveBeenCalledWith(expectedPassword);
    expect(mockUsersService.adminResetPassword).toHaveBeenCalledWith(
      'user-uuid',
      'admin-uuid',
      `hashed:${expectedPassword}`,
    );
  });
});
