import type { S3Service } from '@hena-wadeena/nest-common';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateGuideDto } from './dto';
import { GuidesService } from './guides.service';

type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
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
    .fn()
    .mockImplementation((onFulfilled: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(onFulfilled),
    );

  chain.execute = vi.fn().mockResolvedValue([]);

  return chain;
}

const mockGuide = {
  id: 'guide-uuid-1',
  userId: 'user-uuid-1',
  licenseNumber: 'LIC-001',
  licenseVerified: false,
  bioAr: 'مرشد سياحي محترف',
  bioEn: 'Professional tour guide',
  languages: ['arabic', 'english'],
  specialties: ['history'],
  profileImage: null,
  coverImage: null,
  areasOfOperation: ['kharga'],
  basePrice: 15000,
  ratingAvg: null,
  ratingCount: 0,
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

const baseFilters = { page: 1, limit: 20 };

describe('GuidesService', () => {
  let service: GuidesService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockS3: S3Service;
  let mockGetPresignedUploadUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockGetPresignedUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: 'https://s3.example.com/signed',
      key: 'guides/guide-uuid-1/profile/uuid-photo.jpg',
      expiresAt: '2026-03-20T00:00:00.000Z',
    });
    mockS3 = {
      getPresignedUploadUrl: mockGetPresignedUploadUrl,
    } as unknown as S3Service;

    service = new GuidesService(mockDb as any, mockS3);
  });

  // ─────────────────────────────────────────── resolveGuideId
  describe('resolveGuideId', () => {
    it('found: returns guide id', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'guide-uuid-1' }]).then(resolve),
      );

      const result = await service.resolveGuideId('user-uuid-1');
      expect(result).toBe('guide-uuid-1');
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.resolveGuideId('unknown-user')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────── create
  describe('create', () => {
    const dto: CreateGuideDto = {
      licenseNumber: 'LIC-001',
      basePrice: 15000,
      bioAr: 'مرشد سياحي',
      languages: [GuideLanguage.ARABIC],
      specialties: [GuideSpecialty.HISTORY],
      areasOfOperation: ['kharga'],
    };

    it('success: inserts and returns the new guide profile', async () => {
      // userId check: no existing
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // licenseNumber check: no existing
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // insert .returning()
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockGuide]).then(resolve),
      );

      const result = await service.create(dto, 'user-uuid-1');
      expect(result).toEqual(mockGuide);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          licenseNumber: 'LIC-001',
          basePrice: 15000,
        }),
      );
    });

    it('duplicate userId: throws ConflictException', async () => {
      // userId check: found
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'existing-guide' }]).then(resolve),
      );

      await expect(service.create(dto, 'user-uuid-1')).rejects.toThrow(ConflictException);
    });

    it('duplicate licenseNumber: throws ConflictException', async () => {
      // userId check: not found
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // licenseNumber check: found
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'other-guide' }]).then(resolve),
      );

      await expect(service.create(dto, 'user-uuid-2')).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────── findAll
  describe('findAll', () => {
    it('no filters: returns paginated results with hasMore=false', async () => {
      // count query runs first (countGuides is async, executes before Promise.all registers data .then)
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ total: 1 }]).then(resolve),
      );
      // data query
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockGuide]).then(resolve),
      );

      const result = await service.findAll(baseFilters);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('with language filter: where clause applied', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 0 }]).then(resolve),
        );

      await service.findAll({ ...baseFilters, language: GuideLanguage.ARABIC });
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('with search term: where clause applied for bioAr/bioEn ilike', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 0 }]).then(resolve),
        );

      await service.findAll({ ...baseFilters, search: 'مرشد' });
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('empty results: returns empty data array and total=0', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 0 }]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        );

      const result = await service.findAll(baseFilters);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('hasMore: true when more records exist beyond current page', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 100 }]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve(Array(5).fill(mockGuide)).then(resolve),
        );

      const result = await service.findAll({ ...baseFilters, page: 1, limit: 5 });
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(100);
    });
  });

  // ─────────────────────────────────────────── findById
  describe('findById', () => {
    it('found: returns guide with packageCount and reviewCount', async () => {
      const guideWithStats = { ...mockGuide, packageCount: 3, reviewCount: 7 };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([guideWithStats]).then(resolve),
      );

      const result = await service.findById('guide-uuid-1');
      expect(result).toEqual(guideWithStats);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('soft-deleted: throws NotFoundException (active+deletedAt filter applied)', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.findById('deleted-guide-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────── findGuidePackages
  describe('findGuidePackages', () => {
    it('found: returns paginated active packages with attraction slugs', async () => {
      // guide exists check (chain)
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'guide-uuid-1' }]).then(resolve),
      );

      const packageRow = {
        id: 'pkg-1',
        titleAr: 'جولة الواحات',
        attractionSlugs: ['kharga-oasis'],
      };
      // execute: packages
      mockDb.execute
        .mockResolvedValueOnce([packageRow])
        // execute: count
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await service.findGuidePackages('guide-uuid-1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it('guide not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.findGuidePackages('nonexistent', 1, 20)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────── findMyProfile
  describe('findMyProfile', () => {
    it('found: resolves guide by userId and returns profile with stats', async () => {
      // resolveGuideId: userId → guideId
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'guide-uuid-1' }]).then(resolve),
      );
      // findById: guideId → full profile
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ ...mockGuide, packageCount: 2, reviewCount: 4 }]).then(resolve),
      );

      const result = await service.findMyProfile('user-uuid-1');
      expect(result).toMatchObject({ id: 'guide-uuid-1', packageCount: 2, reviewCount: 4 });
    });

    it('not found: throws NotFoundException when userId has no guide', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.findMyProfile('unknown-user')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────── update
  describe('update', () => {
    it('success: partial update with updatedAt set, returns updated guide', async () => {
      // resolveGuideId
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'guide-uuid-1' }]).then(resolve),
      );
      // update .returning()
      const updated = { ...mockGuide, bioEn: 'Expert tour guide' };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([updated]).then(resolve),
      );

      const result = await service.update('user-uuid-1', { bioEn: 'Expert tour guide' });
      expect(result).toMatchObject({ bioEn: 'Expert tour guide' });
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      );
    });

    it('not found: throws NotFoundException when update returns nothing', async () => {
      // resolveGuideId
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'guide-uuid-1' }]).then(resolve),
      );
      // update .returning() → nothing
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.update('user-uuid-1', { bioEn: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────── getUploadUrl
  describe('getUploadUrl', () => {
    it('returns presigned URL with correct S3 key pattern guides/{guideId}/{imageType}/{uuid}-{filename}', async () => {
      // resolveGuideId
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: 'guide-uuid-1' }]).then(resolve),
      );

      const uploadDto = {
        contentType: 'image/jpeg',
        filename: 'photo.jpg',
        imageType: 'profile' as const,
      };
      await service.getUploadUrl('user-uuid-1', uploadDto);

      expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
          key: expect.stringMatching(/^guides\/guide-uuid-1\/profile\/.+-photo\.jpg$/),
        }),
      );
    });
  });

  // ─────────────────────────────────────────── adminFindAll
  describe('adminFindAll', () => {
    it('no status filter: includes all guides without forced active/deletedAt filter', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 1 }]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([mockGuide]).then(resolve),
        );

      const result = await service.adminFindAll(baseFilters);
      expect(result.data).toEqual([mockGuide]);
      expect(result.total).toBe(1);
    });

    it('status=active: applies active=true + deletedAt IS NULL filter', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 0 }]).then(resolve),
        );

      await service.adminFindAll(baseFilters, 'active');
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('status=deleted: applies deletedAt IS NOT NULL filter', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 0 }]).then(resolve),
        );

      await service.adminFindAll(baseFilters, 'deleted');
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────── adminVerify
  describe('adminVerify', () => {
    it('success: sets licenseVerified and updatedAt', async () => {
      const verified = { ...mockGuide, licenseVerified: true };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([verified]).then(resolve),
      );

      const result = await service.adminVerify('guide-uuid-1', true);
      expect(result.licenseVerified).toBe(true);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ licenseVerified: true, updatedAt: expect.any(Date) }),
      );
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.adminVerify('nonexistent', true)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────── adminSetStatus
  describe('adminSetStatus', () => {
    it('success: sets active status and updatedAt', async () => {
      const deactivated = { ...mockGuide, active: false };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([deactivated]).then(resolve),
      );

      const result = await service.adminSetStatus('guide-uuid-1', false);
      expect(result.active).toBe(false);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ active: false, updatedAt: expect.any(Date) }),
      );
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );

      await expect(service.adminSetStatus('nonexistent', false)).rejects.toThrow(NotFoundException);
    });
  });
});
