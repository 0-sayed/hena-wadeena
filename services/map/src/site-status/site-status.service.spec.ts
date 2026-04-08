import { UserRole } from '@hena-wadeena/types';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PG_UNIQUE_VIOLATION } from '../utils/db';

import { SiteStatusService } from './site-status.service';

type ThenFn = (
  onFulfilled: (v: unknown[]) => unknown,
  onRejected?: (err: unknown) => unknown,
) => Promise<unknown>;

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
    'leftJoin',
    'execute',
    'delete',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = vi
    .fn<ThenFn>()
    .mockImplementation((onFulfilled, onRejected) =>
      Promise.resolve([]).then(onFulfilled, onRejected),
    );

  return chain;
}

const mockPoi = { id: 'poi-uuid-1' };

const mockStatusUpdate = {
  id: 'status-uuid-1',
  poiId: 'poi-uuid-1',
  stewardId: 'steward-uuid-1',
  status: 'open' as const,
  noteAr: null,
  noteEn: null,
  validUntil: null,
  createdAt: new Date(),
};

const mockSteward = {
  id: 'steward-row-uuid-1',
  poiId: 'poi-uuid-1',
  userId: 'steward-uuid-1',
  grantedBy: 'admin-uuid-1',
  grantedAt: new Date(),
};

function resolveWith(values: unknown[]) {
  return (fn: (v: unknown[]) => unknown) => Promise.resolve(values).then(fn);
}

describe('SiteStatusService', () => {
  let service: SiteStatusService;
  let mockDb: MockChain;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new SiteStatusService(mockDb as never);
  });

  describe('getLatestStatus', () => {
    it('should return the latest status update for a POI', async () => {
      // assertPoiExists — POI found
      mockDb.then.mockImplementationOnce(resolveWith([mockPoi]));
      // status query — update found
      mockDb.then.mockImplementationOnce(resolveWith([mockStatusUpdate]));

      const result = await service.getLatestStatus('poi-uuid-1');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('open');
      expect(result?.poiId).toBe('poi-uuid-1');
    });

    it('should return null when no status updates exist for a POI', async () => {
      // assertPoiExists — POI found
      mockDb.then.mockImplementationOnce(resolveWith([mockPoi]));
      // status query — no updates
      mockDb.then.mockImplementationOnce(resolveWith([]));

      const result = await service.getLatestStatus('poi-uuid-1');

      expect(result).toBeNull();
    });

    it('should throw NotFoundException when POI does not exist', async () => {
      // assertPoiExists — POI not found
      mockDb.then.mockImplementationOnce(resolveWith([]));

      await expect(service.getLatestStatus('nonexistent-poi')).rejects.toThrow(NotFoundException);
    });
  });

  describe('postStatus', () => {
    it('should allow an authorized steward to post a status update', async () => {
      // assertPoiApproved — POI found and approved
      mockDb.then.mockImplementationOnce(resolveWith([mockPoi]));
      // assertIsSteward — steward found
      mockDb.then.mockImplementationOnce(resolveWith([mockSteward]));
      // insert returning
      mockDb.then.mockImplementationOnce(resolveWith([mockStatusUpdate]));

      const result = await service.postStatus('poi-uuid-1', 'steward-uuid-1', UserRole.RESIDENT, {
        status: 'open',
      } as any);

      expect(result.status).toBe('open');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should allow an admin to post without being in site_stewards', async () => {
      // assertPoiApproved — POI found and approved
      mockDb.then.mockImplementationOnce(resolveWith([mockPoi]));
      // insert returning — no steward check for admin
      mockDb.then.mockImplementationOnce(resolveWith([mockStatusUpdate]));

      const result = await service.postStatus('poi-uuid-1', 'admin-uuid-1', UserRole.ADMIN, {
        status: 'open',
      } as any);

      expect(result.status).toBe('open');
      // steward lookup should NOT have been called — only the POI check and insert
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user is not a steward', async () => {
      // assertPoiApproved — POI found
      mockDb.then.mockImplementationOnce(resolveWith([mockPoi]));
      // assertIsSteward — no steward row found
      mockDb.then.mockImplementationOnce(resolveWith([]));

      await expect(
        service.postStatus('poi-uuid-1', 'random-user-uuid', UserRole.TOURIST, {
          status: 'open',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when POI is not approved', async () => {
      // assertPoiApproved — not found (deleted or pending)
      mockDb.then.mockImplementationOnce(resolveWith([]));

      await expect(
        service.postStatus('deleted-poi-uuid', 'steward-uuid-1', UserRole.RESIDENT, {
          status: 'open',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatusBoard', () => {
    it('should return paginated POIs with nullable status fields', async () => {
      const boardRow = {
        id: 'poi-uuid-1',
        nameAr: 'واحة الكريس',
        nameEn: 'Ain el-Meftella',
        category: 'natural',
        location: { x: 28.9, y: 25.5 },
        status: 'open',
        statusNoteAr: null,
        statusNoteEn: null,
        validUntil: null,
        statusUpdatedAt: new Date(),
      };

      mockDb.then
        .mockImplementationOnce(resolveWith([boardRow]))
        .mockImplementationOnce(resolveWith([{ count: 1 }]));

      const result = await service.getStatusBoard({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]!.status).toBe('open');
    });

    it('should include POIs with null status when no updates exist', async () => {
      const boardRowNoStatus = {
        id: 'poi-uuid-2',
        nameAr: 'قصر الداخلة',
        nameEn: null,
        category: 'historical',
        location: { x: 29.0, y: 25.6 },
        status: null,
        statusNoteAr: null,
        statusNoteEn: null,
        validUntil: null,
        statusUpdatedAt: null,
      };

      mockDb.then
        .mockImplementationOnce(resolveWith([boardRowNoStatus]))
        .mockImplementationOnce(resolveWith([{ count: 1 }]));

      const result = await service.getStatusBoard({ page: 1, limit: 20 });

      expect(result.data[0]!.status).toBeNull();
    });
  });

  describe('grantSteward', () => {
    it('should grant steward access to a user', async () => {
      mockDb.then
        .mockImplementationOnce(resolveWith([mockPoi])) // assertPoiApproved
        .mockImplementationOnce(resolveWith([mockSteward])); // insert returning

      const result = await service.grantSteward('poi-uuid-1', 'steward-uuid-1', 'admin-uuid-1');

      expect(result.userId).toBe('steward-uuid-1');
      expect(result.poiId).toBe('poi-uuid-1');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw ConflictException when user is already a steward', async () => {
      mockDb.then
        .mockImplementationOnce(resolveWith([mockPoi])) // assertPoiApproved
        .mockImplementationOnce((_onFulfilled, onRejected) => {
          const err = Object.assign(new Error('duplicate key'), { code: PG_UNIQUE_VIOLATION });
          return Promise.resolve().then(() => onRejected?.(err));
        });

      await expect(
        service.grantSteward('poi-uuid-1', 'steward-uuid-1', 'admin-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeSteward', () => {
    it('should revoke steward access', async () => {
      // DELETE ... RETURNING — row deleted
      mockDb.then.mockImplementationOnce(resolveWith([mockSteward]));

      await service.revokeSteward('poi-uuid-1', 'steward-uuid-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when steward grant does not exist', async () => {
      // DELETE ... RETURNING — no row deleted
      mockDb.then.mockImplementationOnce(resolveWith([]));

      await expect(service.revokeSteward('poi-uuid-1', 'nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
