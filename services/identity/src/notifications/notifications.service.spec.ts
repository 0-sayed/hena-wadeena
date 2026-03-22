import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../test-utils/create-mock-db';

import { NotificationsService } from './notifications.service';

const mockNotification = {
  id: 'notif-uuid',
  userId: 'user-uuid',
  type: 'system' as const,
  titleAr: 'عنوان',
  titleEn: 'Title',
  bodyAr: 'نص',
  bodyEn: 'Body',
  data: null,
  readAt: null,
  createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };
    service = new NotificationsService(mockDb as any, mockRedis as any);
  });

  describe('create', () => {
    it('should insert notification and bust unread cache', async () => {
      mockDb.returning.mockResolvedValueOnce([mockNotification]);
      const result = await service.create({
        userId: 'user-uuid',
        type: 'system',
        titleAr: 'عنوان',
        titleEn: 'Title',
        bodyAr: 'نص',
        bodyEn: 'Body',
      });
      expect(result).toEqual(mockNotification);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('notif:unread:user-uuid');
    });
  });

  describe('getUnreadCount', () => {
    it('should return cached count when available', async () => {
      mockRedis.get.mockResolvedValueOnce('5');
      const result = await service.getUnreadCount('user-uuid');
      expect(result).toBe(5);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should query DB and cache when no cached value', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      // select().from().where() chain — where() is the terminal call
      mockDb.where.mockResolvedValueOnce([{ count: 3 }]);
      const result = await service.getUnreadCount('user-uuid');
      expect(result).toBe(3);
      expect(mockRedis.set).toHaveBeenCalledWith('notif:unread:user-uuid', '3', 'EX', 60);
    });
  });

  describe('markRead', () => {
    it('should update read_at and bust cache', async () => {
      mockDb.returning.mockResolvedValueOnce([{ ...mockNotification, readAt: new Date() }]);
      await service.markRead('notif-uuid', 'user-uuid');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('notif:unread:user-uuid');
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      await expect(service.markRead('bad-id', 'user-uuid')).rejects.toThrow();
    });
  });

  describe('markAllRead', () => {
    it('should bulk update and bust cache', async () => {
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);
      await service.markAllRead('user-uuid');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('notif:unread:user-uuid');
    });
  });
});
