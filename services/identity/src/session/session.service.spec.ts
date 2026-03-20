import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createMockDb } from '../test-utils/create-mock-db';

import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: {
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDb = createMockDb();
    mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };
    const module = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: DRIZZLE_CLIENT, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(SessionService);
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active refresh tokens without setting blocked flag', async () => {
      mockDb.where.mockResolvedValueOnce([]);
      await service.revokeAllUserSessions('user-123');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('blockUser', () => {
    it('should set blocked flag in Redis with 15-min TTL', async () => {
      await service.blockUser('user-123');
      expect(mockRedis.set).toHaveBeenCalledWith('id:blocked:user-123', '1', 'EX', 900);
    });
  });

  describe('unblockUser', () => {
    it('should delete the blocked flag from Redis', async () => {
      await service.unblockUser('user-123');
      expect(mockRedis.del).toHaveBeenCalledWith('id:blocked:user-123');
    });
  });

  describe('blacklistAccessToken', () => {
    it('should set redis key with TTL when token not expired', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 min from now
      await service.blacklistAccessToken('jti-abc', futureExp);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'id:blacklist:jti-abc',
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should not set redis key when token already expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      await service.blacklistAccessToken('jti-abc', pastExp);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
