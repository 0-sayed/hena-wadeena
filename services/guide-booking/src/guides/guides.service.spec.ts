import type { S3Service } from '@hena-wadeena/nest-common';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../test/mock-db';

import type { CreateGuideDto } from './dto';
import { createGuideSchema } from './dto/create-guide.dto';
import { expandGuideSearchTerms, GuidesService } from './guides.service';
import type { IdentityClient } from './identity-client.service';

const mockGuide = {
  id: 'guide-uuid-1',
  userId: 'user-uuid-1',
  displayName: null,
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
  let mockIdentityClient: Pick<IdentityClient, 'getDisplayName'>;

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
    mockIdentityClient = { getDisplayName: vi.fn().mockResolvedValue(null) };

    service = new GuidesService(mockDb as any, mockS3, mockIdentityClient as IdentityClient);
  });

  describe('expandGuideSearchTerms', () => {
    it('maps partial Arabic specialty text to the stored enum value', () => {
      expect(expandGuideSearchTerms('مغا')).toContain('adventure');
    });

    it('maps partial Arabic area text to the stored enum value', () => {
      expect(expandGuideSearchTerms('الخا')).toContain('kharga');
    });
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

      (mockIdentityClient.getDisplayName as ReturnType<typeof vi.fn>).mockResolvedValueOnce('يوسف');

      const result = await service.create(dto, 'user-uuid-1');
      expect(result).toEqual(mockGuide);
      expect(mockIdentityClient.getDisplayName).toHaveBeenCalledWith('user-uuid-1');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          licenseNumber: 'LIC-001',
          basePrice: 15000,
          displayName: 'يوسف',
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

    it('with display_name search: where clause applied for displayName ilike', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ total: 0 }]).then(resolve),
        );

      await service.findAll({ ...baseFilters, search: 'مريم' });
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

  // ─────────────────────────────────────────── create — ETAA fields
  describe('create — ETAA fields', () => {
    it('persists etaaLicenseNumber when provided', async () => {
      const dto: CreateGuideDto = {
        licenseNumber: 'LIC-002',
        basePrice: 10000,
        etaaLicenseNumber: 'ETAA-123',
        vehicleType: '4WD',
      };
      mockDb.returning!.mockResolvedValue([
        { ...mockGuide, etaaLicenseNumber: 'ETAA-123', vehicleType: '4WD' },
      ]);
      mockDb.where!.mockReturnValue(mockDb); // no existing guide
      // first where returns [] (no duplicate), second where returns []
      mockDb.then
        .mockImplementationOnce((r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r)) // userId check
        .mockImplementationOnce((r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r)); // license check

      const result = await service.create(dto, 'user-uuid-2');
      expect(result.etaaLicenseNumber).toBe('ETAA-123');
      expect(result.vehicleType).toBe('4WD');
    });
  });

  // ─────────────────────────────────────────── adminEtaaVerify
  describe('adminEtaaVerify', () => {
    it('sets etaa_verified=true and etaa_verified_at', async () => {
      const now = new Date();
      mockDb.returning!.mockResolvedValue([
        { ...mockGuide, etaaVerified: true, etaaVerifiedAt: now },
      ]);

      const result = await service.adminEtaaVerify('guide-uuid-1', true);

      expect(result.etaaVerified).toBe(true);
      expect(result.etaaVerifiedAt).toEqual(now);
    });

    it('throws NotFoundException when guide not found', async () => {
      mockDb.returning!.mockResolvedValue([]);

      await expect(service.adminEtaaVerify('missing-id', true)).rejects.toThrow(NotFoundException);
    });
  });
});

// ─────────────────────────────────────────── createGuideSchema (ETAA + vehicle fields)
describe('createGuideSchema — ETAA + vehicle fields', () => {
  const baseValid = {
    licenseNumber: 'LIC-001',
    basePrice: 15000,
  };

  describe('valid inputs', () => {
    it('accepts all 5 new fields when provided with valid values', () => {
      const result = createGuideSchema.safeParse({
        ...baseValid,
        etaaLicenseNumber: 'ETAA-9999',
        insurancePolicyUrl: 'https://insurance.example.com/policy/123',
        insuranceValidUntil: '2027-12-31',
        vehiclePlate: 'ABC 123',
        vehicleType: '4WD',
      });
      expect(result.success).toBe(true);
    });

    it('accepts minibus as vehicleType', () => {
      const result = createGuideSchema.safeParse({ ...baseValid, vehicleType: 'minibus' });
      expect(result.success).toBe(true);
    });

    it('accepts motorcycle as vehicleType', () => {
      const result = createGuideSchema.safeParse({ ...baseValid, vehicleType: 'motorcycle' });
      expect(result.success).toBe(true);
    });

    it('accepts when all 5 new fields are omitted (all optional)', () => {
      const result = createGuideSchema.safeParse(baseValid);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects insurancePolicyUrl that is not a URL', () => {
      const result = createGuideSchema.safeParse({
        ...baseValid,
        insurancePolicyUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('rejects vehicleType outside the allowed enum', () => {
      const result = createGuideSchema.safeParse({ ...baseValid, vehicleType: 'truck' });
      expect(result.success).toBe(false);
    });

    it('rejects insuranceValidUntil that is not an ISO date string', () => {
      const result = createGuideSchema.safeParse({
        ...baseValid,
        insuranceValidUntil: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });
});
