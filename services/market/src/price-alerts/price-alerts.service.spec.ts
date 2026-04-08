import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedisStreams } from '../shared/test-helpers';

import { PriceAlertsService } from './price-alerts.service';

const mockRedisStreams = createMockRedisStreams();

const mockSub = {
  id: 'sub-001',
  userId: 'user-001',
  commodityId: 'comm-001',
  thresholdPrice: 800,
  direction: 'above' as const,
  isActive: true,
  lastTriggeredAt: null,
  createdAt: new Date('2026-04-01'),
};

describe('PriceAlertsService', () => {
  let service: PriceAlertsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    mockRedisStreams.publish.mockResolvedValue('mock-stream-id');
    service = new PriceAlertsService(mockDb as never, mockRedisStreams as never);
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('returns the created subscription row', async () => {
      mockDb.returning.mockResolvedValueOnce([mockSub]);

      const result = await service.create('user-001', {
        commodityId: 'comm-001',
        thresholdPrice: 800,
        direction: 'above',
      });

      expect(result).toEqual(mockSub);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          commodityId: 'comm-001',
          thresholdPrice: 800,
          direction: 'above',
        }),
      );
    });

    it('throws 409 ConflictException on duplicate (23505)', async () => {
      mockDb.returning.mockRejectedValueOnce(
        Object.assign(new Error('unique violation'), { code: '23505' }),
      );

      await expect(
        service.create('user-001', {
          commodityId: 'comm-001',
          thresholdPrice: 800,
          direction: 'above',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException on FK violation (23503)', async () => {
      mockDb.returning.mockRejectedValueOnce(
        Object.assign(new Error('fk violation'), { code: '23503' }),
      );

      await expect(
        service.create('user-001', {
          commodityId: 'nonexistent',
          thresholdPrice: 800,
          direction: 'above',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // findAllForUser
  // -------------------------------------------------------------------------

  describe('findAllForUser', () => {
    it('returns subscriptions with commodity name for the current user', async () => {
      const rows = [{ ...mockSub, commodityNameAr: 'تمور' }];
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve(rows).then(resolve);
      });

      const result = await service.findAllForUser('user-001');

      expect(result).toEqual(rows);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.innerJoin).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('updates threshold on owned subscription and returns updated row', async () => {
      const updated = { ...mockSub, thresholdPrice: 1000 };
      mockDb.limit.mockResolvedValueOnce([mockSub]); // ownership fetch
      mockDb.returning.mockResolvedValueOnce([updated]); // update

      const result = await service.update('sub-001', 'user-001', { thresholdPrice: 1000 });

      expect(result.thresholdPrice).toBe(1000);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('throws 404 when subscription does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // not found

      await expect(service.update('sub-001', 'user-001', { thresholdPrice: 1000 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 when subscription belongs to another user', async () => {
      const otherSub = { ...mockSub, userId: 'other-user' };
      mockDb.limit.mockResolvedValueOnce([otherSub]); // found but wrong owner

      await expect(service.update('sub-001', 'user-001', { thresholdPrice: 1000 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 409 ConflictException when direction change violates UNIQUE constraint', async () => {
      mockDb.limit.mockResolvedValueOnce([mockSub]); // ownership fetch
      mockDb.returning.mockRejectedValueOnce(
        Object.assign(new Error('unique violation'), { code: '23505' }),
      );

      await expect(service.update('sub-001', 'user-001', { direction: 'below' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('deletes owned subscription without error', async () => {
      mockDb.limit.mockResolvedValueOnce([mockSub]); // ownership fetch

      await expect(service.remove('sub-001', 'user-001')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('throws 404 when subscription does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.remove('sub-001', 'user-001')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when subscription belongs to another user', async () => {
      const otherSub = { ...mockSub, userId: 'other-user' };
      mockDb.limit.mockResolvedValueOnce([otherSub]);

      await expect(service.remove('sub-001', 'user-001')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // evaluateForCommodity
  // -------------------------------------------------------------------------

  describe('evaluateForCommodity', () => {
    const commodityRow = { nameAr: 'تمور' };
    const activeSub = {
      id: 'sub-001',
      userId: 'user-001',
      commodityId: 'comm-001',
      thresholdPrice: 800,
      direction: 'above' as const,
      isActive: true,
      lastTriggeredAt: null,
      createdAt: new Date('2026-04-01'),
    };

    it('emits PRICE_ALERT_TRIGGERED and updates lastTriggeredAt when price crosses threshold above', async () => {
      mockDb.limit.mockResolvedValueOnce([commodityRow]); // commodity fetch
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([activeSub]).then(resolve);
      }); // subscriptions fetch
      // db.update().set().where() uses then (default [] is fine)

      const recordedAt = new Date('2026-04-01T12:00:00Z');
      await service.evaluateForCommodity('comm-001', 900, recordedAt);

      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        'price.alert.triggered',
        expect.objectContaining({
          userId: 'user-001',
          commodityId: 'comm-001',
          commodityNameAr: 'تمور',
          thresholdPrice: '800',
          actualPrice: '900',
          direction: 'above',
        }),
      );
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('does not emit event when price is below threshold (direction=above)', async () => {
      mockDb.limit.mockResolvedValueOnce([commodityRow]);
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([activeSub]).then(resolve);
      });

      await service.evaluateForCommodity('comm-001', 700, new Date());

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });

    it('emits event when price equals threshold exactly (above is >=)', async () => {
      mockDb.limit.mockResolvedValueOnce([commodityRow]);
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([activeSub]).then(resolve);
      });

      await service.evaluateForCommodity('comm-001', 800, new Date());

      expect(mockRedisStreams.publish).toHaveBeenCalled();
    });

    it('emits event for direction=below when price is at or below threshold', async () => {
      const belowSub = { ...activeSub, direction: 'below' as const, thresholdPrice: 500 };
      mockDb.limit.mockResolvedValueOnce([commodityRow]);
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([belowSub]).then(resolve);
      });

      await service.evaluateForCommodity('comm-001', 400, new Date());

      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        'price.alert.triggered',
        expect.objectContaining({ direction: 'below', thresholdPrice: '500', actualPrice: '400' }),
      );
    });

    it('does not emit when lastTriggeredAt === recordedAt (same-batch dedup handled by DB filter)', async () => {
      // The WHERE clause filters out subs with lastTriggeredAt >= recordedAt
      // so the DB returns no eligible subs — we simulate this
      mockDb.limit.mockResolvedValueOnce([commodityRow]);
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([]).then(resolve); // no eligible subs returned
      });

      const recordedAt = new Date('2026-04-01T12:00:00Z');
      await service.evaluateForCommodity('comm-001', 900, recordedAt);

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });

    it('emits again when recordedAt is newer than lastTriggeredAt', async () => {
      const oldDate = new Date('2026-03-01');
      const subWithOldTrigger = { ...activeSub, lastTriggeredAt: oldDate };
      const newDate = new Date('2026-04-01');

      mockDb.limit.mockResolvedValueOnce([commodityRow]);
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([subWithOldTrigger]).then(resolve);
      });

      await service.evaluateForCommodity('comm-001', 900, newDate);

      expect(mockRedisStreams.publish).toHaveBeenCalled();
    });

    it('skips inactive subscription (isActive=false filtered by DB WHERE clause)', async () => {
      // DB WHERE includes isActive=true, so inactive subs are never returned
      mockDb.limit.mockResolvedValueOnce([commodityRow]);
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown) => void) => {
        void Promise.resolve([]).then(resolve); // inactive sub excluded by DB query
      });

      await service.evaluateForCommodity('comm-001', 900, new Date());

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });

    it('returns early and emits nothing when commodity does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // commodity not found

      await service.evaluateForCommodity('nonexistent', 900, new Date());

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });
  });
});
