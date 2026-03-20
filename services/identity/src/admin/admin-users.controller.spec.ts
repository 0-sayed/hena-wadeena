import { ForbiddenException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UsersService } from '../users/users.service';

import { AdminUsersController } from './admin-users.controller';

const mockAdmin = { sub: 'admin-uuid', email: 'admin@test.com', role: 'admin' };
const mockUser = {
  id: 'user-uuid',
  email: 'user@test.com',
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
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let mockUsersService: {
    findAll: ReturnType<typeof vi.fn>;
    findByIdOrThrow: ReturnType<typeof vi.fn>;
    changeRole: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUsersService = {
      findAll: vi
        .fn()
        .mockResolvedValue({ data: [mockUser], total: 1, page: 1, limit: 20, hasMore: false }),
      findByIdOrThrow: vi.fn().mockResolvedValue(mockUser),
      changeRole: vi.fn().mockResolvedValue({ ...mockUser, role: 'admin' }),
      changeStatus: vi.fn().mockResolvedValue({ ...mockUser, status: 'suspended' }),
      softDelete: vi.fn().mockResolvedValue(undefined),
    };
    controller = new AdminUsersController(mockUsersService as unknown as UsersService);
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result = await controller.findAll({ offset: 0, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const result = await controller.findOne('user-uuid');
      expect(result.id).toBe('user-uuid');
    });
  });

  describe('changeRole', () => {
    it('should prevent admin from changing own role', async () => {
      await expect(
        controller.changeRole('admin-uuid', { role: 'tourist' }, mockAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should change user role', async () => {
      const result = await controller.changeRole('user-uuid', { role: 'admin' }, mockAdmin);
      expect(result.role).toBe('admin');
    });
  });

  describe('changeStatus', () => {
    it('should prevent admin from changing own status', async () => {
      await expect(
        controller.changeStatus('admin-uuid', { status: 'suspended' }, mockAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should change user status', async () => {
      const result = await controller.changeStatus(
        'user-uuid',
        { status: 'suspended', reason: 'violation' },
        mockAdmin,
      );
      expect(result.status).toBe('suspended');
    });
  });

  describe('remove', () => {
    it('should prevent admin from deleting themselves', async () => {
      await expect(controller.remove('admin-uuid', mockAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete user', async () => {
      await controller.remove('user-uuid', mockAdmin);
      expect(mockUsersService.softDelete).toHaveBeenCalledWith('user-uuid', 'admin-uuid');
    });
  });
});
