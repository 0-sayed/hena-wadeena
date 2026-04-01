import type { RedisStreamsService } from '@hena-wadeena/nest-common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { SessionService } from '../session/session.service';
import { createMockDb } from '../test-utils/create-mock-db';

import { UsersService } from './users.service';

const mockUser = {
  id: 'test-uuid',
  email: 'test@example.com',
  fullName: 'Test User',
  displayName: null,
  avatarUrl: null,
  passwordHash: 'hashed',
  role: 'tourist' as const,
  status: 'active' as const,
  language: 'ar',
  phone: null,
  verifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  searchVector: null,
  balancePiasters: 0,
};

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockSessionService: {
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
    blockUser: ReturnType<typeof vi.fn>;
    unblockUser: ReturnType<typeof vi.fn>;
  };
  let mockRedisStreams: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = createMockDb();
    // Default returning to mockUser for create/update tests
    mockDb.returning.mockResolvedValue([mockUser]);
    mockSessionService = {
      revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
      blockUser: vi.fn().mockResolvedValue(undefined),
      unblockUser: vi.fn().mockResolvedValue(undefined),
    };
    mockRedisStreams = { publish: vi.fn().mockResolvedValue('stream-id') };
    service = new UsersService(
      mockDb as any,
      mockSessionService as unknown as SessionService,
      mockRedisStreams as unknown as RedisStreamsService,
    );
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await service.findByEmail('notfound@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      const result = await service.findById('test-uuid');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert user and return it', async () => {
      const result = await service.create({
        email: 'new@example.com',
        fullName: 'New User',
        passwordHash: 'hashed',
        role: 'tourist',
      });
      expect(result).toEqual(mockUser);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update and return user', async () => {
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, displayName: 'Updated' }]);
      const result = await service.updateProfile('test-uuid', { displayName: 'Updated' });
      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      await service.updateLastLogin('test-uuid');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return user when found', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      const result = await service.findByIdOrThrow('test-uuid');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(service.findByIdOrThrow('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockDb.where.mockResolvedValueOnce([{ count: 1 }]);
      mockDb.offset.mockResolvedValueOnce([mockUser]);
      const result = await service.findAll({ offset: 0, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('changeRole', () => {
    it('should update user role and return updated user', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]); // findByIdOrThrow
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, role: 'admin' }]);
      const result = await service.changeRole('test-uuid', 'admin', 'admin-uuid');
      expect(result.role).toBe('admin');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should update user status', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]); // findByIdOrThrow
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, status: 'suspended' }]);
      const result = await service.changeStatus('test-uuid', 'suspended', 'admin-uuid');
      expect(result.status).toBe('suspended');
    });
  });

  describe('adminResetPassword', () => {
    it('should not revoke sessions or write audit logs when no user is updated', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.adminResetPassword('missing-user', 'admin-uuid', 'next-password-hash'),
      ).rejects.toThrow();

      expect(mockSessionService.revokeAllUserSessions).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on user', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]); // findByIdOrThrow
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, deletedAt: new Date() }]);
      await service.softDelete('test-uuid', 'admin-uuid');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return user balance', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockUser, balancePiasters: 5000 }]);
      const result = await service.getBalance('test-uuid');
      expect(result).toBe(5000);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(service.getBalance('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('topUp', () => {
    it('should add amount to balance and return new balance', async () => {
      mockDb.returning.mockResolvedValueOnce([{ balancePiasters: 3000 }]);
      const result = await service.topUp('test-uuid', 2000);
      expect(result).toBe(3000);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      await expect(service.topUp('nonexistent', 1000)).rejects.toThrow('User not found');
    });
  });

  describe('deduct', () => {
    it('should subtract amount from balance and return new balance', async () => {
      mockDb.returning.mockResolvedValueOnce([{ balancePiasters: 3000 }]);
      const result = await service.deduct('test-uuid', 2000);
      expect(result).toBe(3000);
    });

    it('should throw BadRequestException when insufficient balance or user not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      const { BadRequestException } = await import('@nestjs/common');
      await expect(service.deduct('test-uuid', 5000)).rejects.toThrow(BadRequestException);
    });
  });
});
