import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

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
};

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    // Default returning to mockUser for create/update tests
    mockDb.returning.mockResolvedValue([mockUser]);
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: DRIZZLE_CLIENT, useValue: mockDb }],
    }).compile();
    service = module.get(UsersService);
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
});
