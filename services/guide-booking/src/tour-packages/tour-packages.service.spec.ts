import type { S3Service } from '@hena-wadeena/nest-common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuidesService } from '../guides/guides.service';

import { TourPackagesService } from './tour-packages.service';

type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
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
    'delete',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = vi
    .fn()
    .mockImplementation((onFulfilled: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(onFulfilled),
    );

  chain.execute = vi.fn().mockResolvedValue([]);

  chain.transaction = vi.fn().mockImplementation((cb: (tx: MockChain) => unknown) => cb(chain));

  return chain;
}

const mockPackage = {
  id: 'pkg-uuid-1',
  guideId: 'guide-uuid-1',
  titleAr: 'جولة واحة الخارجة',
  titleEn: 'Kharga Oasis Tour',
  description: 'A wonderful tour',
  durationHours: 6,
  maxPeople: 10,
  price: 50000,
  includes: ['water', 'guide'],
  images: [],
  status: 'active' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

const baseFilters = { page: 1, limit: 20 };

const mockOwnershipRow = { id: 'pkg-uuid-1', guideId: 'guide-uuid-1' };

describe('TourPackagesService', () => {
  let service: TourPackagesService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockS3: S3Service;
  let mockGetPresignedUploadUrl: ReturnType<typeof vi.fn>;
  let mockGuidesService: GuidesService;
  let mockResolveGuideId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDb = createMockDb();

    mockGetPresignedUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: 'https://s3.example.com/signed',
      key: 'packages/pkg-uuid-1/uuid-photo.jpg',
      expiresAt: '2026-03-20T00:00:00.000Z',
    });
    mockS3 = {
      getPresignedUploadUrl: mockGetPresignedUploadUrl,
    } as unknown as S3Service;

    mockResolveGuideId = vi.fn().mockResolvedValue('guide-uuid-1');
    mockGuidesService = {
      resolveGuideId: mockResolveGuideId,
    } as unknown as GuidesService;

    service = new TourPackagesService(mockDb as any, mockS3, mockGuidesService);
  });

  // ─────────────────────────────────────────── create
  describe('create', () => {
    it('happy path without attractions: inserts package only, no junction entries', async () => {
      // resolveGuideId → guideId
      // no validateAttractionIds (no attractionIds)
      // transaction: insert tourPackages .returning() → [mockPackage]
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPackage]).then(resolve),
      );

      const result = await service.create(
        { titleAr: 'جولة', price: 50000, durationHours: 3, maxPeople: 10 },
        'user-uuid-1',
      );

      expect(result).toEqual(mockPackage);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ guideId: 'guide-uuid-1', titleAr: 'جولة', price: 50000 }),
      );
    });

    it('happy path with attractions: inserts package + junction entries', async () => {
      // validateAttractionIds: 2 valid attractions found
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'attr-1' }, { id: 'attr-2' }]).then(resolve),
      );
      // transaction: insert tourPackages .returning()
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPackage]).then(resolve),
      );
      // transaction: insert tourPackageAttractions (no .returning(), just awaited chain)
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      const result = await service.create(
        {
          titleAr: 'جولة',
          price: 50000,
          durationHours: 3,
          maxPeople: 10,
          attractionIds: ['attr-1', 'attr-2'],
        },
        'user-uuid-1',
      );

      expect(result).toEqual(mockPackage);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('guide not found: throws NotFoundException when resolveGuideId fails', async () => {
      mockResolveGuideId.mockRejectedValueOnce(new NotFoundException('Guide profile not found'));

      await expect(
        service.create(
          { titleAr: 'جولة', price: 50000, durationHours: 3, maxPeople: 10 },
          'unknown-user',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('invalid attractionIds: throws BadRequestException when some IDs are inactive', async () => {
      // validateAttractionIds: only 1 of 2 found
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'attr-1' }]).then(resolve),
      );

      await expect(
        service.create(
          {
            titleAr: 'جولة',
            price: 50000,
            durationHours: 3,
            maxPeople: 10,
            attractionIds: ['attr-1', 'invalid-id'],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────── findAll
  describe('findAll', () => {
    it('returns paginated packages with hasMore=false', async () => {
      const pkgRow = { id: 'pkg-1', titleAr: 'جولة', attractionSlugs: [] };
      // Promise.all: execute[0] → data, execute[1] → count
      mockDb.execute.mockResolvedValueOnce([pkgRow]);
      mockDb.execute.mockResolvedValueOnce([{ total: 1 }]);

      const result = await service.findAll(baseFilters);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('empty results: total=0 and empty data array', async () => {
      mockDb.execute.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValueOnce([{ total: 0 }]);

      const result = await service.findAll(baseFilters);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────── findById
  describe('findById', () => {
    it('found: returns package with guide summary and linked attractions', async () => {
      const pkgWithGuide = { ...mockPackage, guideBioAr: 'مرشد', linkedAttractions: [] };
      mockDb.execute.mockResolvedValueOnce([pkgWithGuide]);

      const result = await service.findById('pkg-uuid-1');
      expect(result).toEqual(pkgWithGuide);
      expect(mockDb.execute).toHaveBeenCalledOnce();
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────── findMyPackages
  describe('findMyPackages', () => {
    it('returns own packages including inactive, excluding deleted', async () => {
      const activeRow = { id: 'pkg-1', status: 'active', attractionSlugs: [] };
      const inactiveRow = { id: 'pkg-2', status: 'inactive', attractionSlugs: [] };
      // execute: rows
      mockDb.execute
        .mockResolvedValueOnce([activeRow, inactiveRow])
        // execute: count
        .mockResolvedValueOnce([{ total: 2 }]);

      const result = await service.findMyPackages('user-uuid-1', undefined, 1, 20);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it('guide not found: throws NotFoundException', async () => {
      mockResolveGuideId.mockRejectedValueOnce(new NotFoundException('Guide profile not found'));

      await expect(service.findMyPackages('unknown-user', undefined, 1, 20)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────── update
  describe('update', () => {
    it('success: partial update with updatedAt set, returns updated package', async () => {
      // assertOwnership: ownership select → [{ id, guideId }]
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockOwnershipRow]).then(resolve),
      );
      // update .returning() → [updatedPkg]
      const updated = { ...mockPackage, titleEn: 'Updated Tour' };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([updated]).then(resolve),
      );

      const result = await service.update('pkg-uuid-1', 'user-uuid-1', {
        titleEn: 'Updated Tour',
      });
      expect(result).toMatchObject({ titleEn: 'Updated Tour' });
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      );
    });

    it('not found: throws NotFoundException when package does not exist', async () => {
      // assertOwnership: ownership select → [] (not found)
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.update('nonexistent', 'user-uuid-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('not owner: throws ForbiddenException when guideId does not match', async () => {
      // assertOwnership: ownership select → package owned by different guide
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'pkg-uuid-1', guideId: 'other-guide-uuid' }]).then(resolve),
      );

      await expect(service.update('pkg-uuid-1', 'user-uuid-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─────────────────────────────────────────── softDelete
  describe('softDelete', () => {
    it('success: sets deletedAt + inactive status, returns message', async () => {
      // assertOwnership: ownership select
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockOwnershipRow]).then(resolve),
      );
      // update (no .returning()) → chain.then → []
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      const result = await service.softDelete('pkg-uuid-1', 'user-uuid-1');
      expect(result).toEqual({ message: 'Package deleted' });
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
          status: 'inactive',
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('not owner: throws ForbiddenException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'pkg-uuid-1', guideId: 'other-guide-uuid' }]).then(resolve),
      );

      await expect(service.softDelete('pkg-uuid-1', 'user-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─────────────────────────────────────────── setAttractions
  describe('setAttractions', () => {
    it('replace list: transaction deletes old, inserts new with sortOrder', async () => {
      // assertOwnership
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockOwnershipRow]).then(resolve),
      );
      // validateAttractionIds: 1 valid attraction
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'attr-1' }]).then(resolve),
      );
      // tx.delete → chain.then
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // tx.insert junction → chain.then
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // tx.update updatedAt → chain.then
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await service.setAttractions('pkg-uuid-1', 'user-uuid-1', {
        attractions: [{ attractionId: 'attr-1', sortOrder: 0 }],
      });

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('empty list: clears all links without inserting new ones', async () => {
      // assertOwnership
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockOwnershipRow]).then(resolve),
      );
      // validateAttractionIds: no-op (empty array)
      // tx.delete → chain.then
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // tx.update updatedAt → chain.then (no insert for empty attractions)
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await service.setAttractions('pkg-uuid-1', 'user-uuid-1', { attractions: [] });

      expect(mockDb.delete).toHaveBeenCalled();
      // insert should not be called for junction (only delete + updatedAt update)
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('invalid IDs: throws BadRequestException', async () => {
      // assertOwnership
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockOwnershipRow]).then(resolve),
      );
      // validateAttractionIds: 0 of 1 found
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(
        service.setAttractions('pkg-uuid-1', 'user-uuid-1', {
          attractions: [{ attractionId: 'bad-id' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('not owner: throws ForbiddenException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'pkg-uuid-1', guideId: 'other-guide-uuid' }]).then(resolve),
      );

      await expect(
        service.setAttractions('pkg-uuid-1', 'user-uuid-1', { attractions: [] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────── getUploadUrl
  describe('getUploadUrl', () => {
    it('returns presigned URL with correct S3 key pattern packages/{id}/{uuid}-{filename}', async () => {
      // assertOwnership
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockOwnershipRow]).then(resolve),
      );

      await service.getUploadUrl('pkg-uuid-1', 'user-uuid-1', {
        contentType: 'image/jpeg',
        filename: 'cover.jpg',
      });

      expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
          key: expect.stringMatching(/^packages\/pkg-uuid-1\/.+-cover\.jpg$/),
        }),
      );
    });
  });

  // ─────────────────────────────────────────── adminFindAll
  describe('adminFindAll', () => {
    it('no status: returns all packages (Promise.all: count first, data second)', async () => {
      // countPackages (async fn, runs first in Promise.all)
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ total: 1 }]).then(resolve),
      );
      // data query
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockPackage]).then(resolve),
      );

      const result = await service.adminFindAll(baseFilters);
      expect(result.data).toEqual([mockPackage]);
      expect(result.total).toBe(1);
    });
  });
});
