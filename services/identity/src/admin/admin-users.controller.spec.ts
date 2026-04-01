import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersService } from '../users/users.service';

import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

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
  searchVector: null,
};

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let mockUsersService: {
    findAll: ReturnType<typeof vi.fn>;
    changeRole: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let mockAdminUsersService: {
    findDetail: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUsersService = {
      findAll: vi
        .fn()
        .mockResolvedValue({ data: [mockUser], total: 1, page: 1, limit: 20, hasMore: false }),
      changeRole: vi.fn().mockResolvedValue({ ...mockUser, role: 'admin' }),
      changeStatus: vi.fn().mockResolvedValue({ ...mockUser, status: 'suspended' }),
      softDelete: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminUsersService = {
      findDetail: vi.fn().mockResolvedValue({
        ...mockUser,
        kycStatus: 'approved',
        latestKycDocumentType: 'national_id',
        kycSubmittedAt: new Date(),
        kycReviewedAt: new Date(),
        recentAuditEvents: [],
      }),
      resetPassword: vi.fn().mockResolvedValue({ password: 'Temp#Pass123' }),
    };
    controller = new AdminUsersController(
      mockUsersService as unknown as UsersService,
      mockAdminUsersService as unknown as AdminUsersService,
    );
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result = await controller.findAll({ offset: 0, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a detailed user profile by id', async () => {
      const result = await controller.findOne('user-uuid');
      expect(result.id).toBe('user-uuid');
      expect(mockAdminUsersService.findDetail).toHaveBeenCalledWith('user-uuid');
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

  describe('resetPassword', () => {
    it('should prevent admin from resetting their own password here', async () => {
      await expect(controller.resetPassword('admin-uuid', mockAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reset a user password', async () => {
      const result = await controller.resetPassword('user-uuid', mockAdmin);
      expect(result.password).toBe('Temp#Pass123');
      expect(mockAdminUsersService.resetPassword).toHaveBeenCalledWith(
        'user-uuid',
        'admin-uuid',
      );
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
