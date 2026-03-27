import { EVENTS } from '@hena-wadeena/types';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PoisService } from './pois.service';

type ThenFn = (onFulfilled: (v: unknown[]) => unknown) => Promise<unknown>;

type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn<ThenFn>>;
};

function createMockDb(): MockChain {
  const chain = {} as MockChain;

  for (const method of [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
    'insert',
    'values',
    'returning',
    'update',
    'set',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = vi
    .fn<ThenFn>()
    .mockImplementation((onFulfilled) => Promise.resolve([]).then(onFulfilled));

  return chain;
}

const mockPoi = {
  id: 'poi-uuid-1',
  nameAr: 'مطعم الواحة',
  nameEn: 'Oasis Restaurant',
  description: 'A local restaurant',
  category: 'restaurant' as const,
  location: { x: 30.55, y: 25.44 },
  address: 'Main Street, Kharga',
  phone: '01234567890',
  website: null,
  images: null,
  ratingAvg: 0,
  ratingCount: 0,
  status: 'approved' as const,
  submittedBy: 'user-uuid-1',
  approvedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('PoisService', () => {
  let service: PoisService;
  let mockDb: MockChain;
  let mockRedisStreams: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedisStreams = { publish: vi.fn().mockResolvedValue(undefined) };
    service = new PoisService(mockDb as never, mockRedisStreams as any);
  });

  describe('findAll', () => {
    it('should return paginated approved POIs', async () => {
      mockDb.then
        .mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
          Promise.resolve([mockPoi]).then(fn),
        )
        .mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
          Promise.resolve([{ count: 1 }]).then(fn),
        );

      const result = await service.findAll({ page: 1, limit: 20, radius: 10_000 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a POI by id', async () => {
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPoi]).then(fn),
      );

      const result = await service.findById('poi-uuid-1');
      expect(result.id).toBe('poi-uuid-1');
    });

    it('should throw NotFoundException if POI not found', async () => {
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(fn),
      );

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a POI with pending status', async () => {
      const created = { ...mockPoi, status: 'pending' as const };
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([created]).then(fn),
      );

      const result = await service.create(
        {
          nameAr: 'مطعم الواحة',
          category: 'restaurant',
          location: { lat: 25.44, lng: 30.55 },
        },
        'user-uuid-1',
      );

      expect(result.status).toBe('pending');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should approve a pending POI and publish event', async () => {
      const pendingPoi = { ...mockPoi, status: 'pending' as const };
      const approvedPoi = { ...mockPoi, status: 'approved' as const, approvedBy: 'admin-uuid' };

      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([pendingPoi]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([approvedPoi]).then(fn),
      );

      const result = await service.approve('poi-uuid-1', 'admin-uuid');

      expect(result.status).toBe('approved');
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        EVENTS.POI_APPROVED,
        expect.objectContaining({ poiId: 'poi-uuid-1' }),
      );
    });

    it('should throw BadRequestException if POI is not pending', async () => {
      mockDb.then.mockImplementationOnce(
        (fn: (v: unknown[]) => unknown) => Promise.resolve([mockPoi]).then(fn), // status is 'approved'
      );

      await expect(service.approve('poi-uuid-1', 'admin-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should reject a pending POI', async () => {
      const pendingPoi = { ...mockPoi, status: 'pending' as const };
      const rejectedPoi = { ...mockPoi, status: 'rejected' as const };

      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([pendingPoi]).then(fn),
      );
      mockDb.then.mockImplementationOnce((fn: (v: unknown[]) => unknown) =>
        Promise.resolve([rejectedPoi]).then(fn),
      );

      const result = await service.reject('poi-uuid-1');

      expect(result.status).toBe('rejected');
    });
  });
});
