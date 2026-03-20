import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedis, createMockRedisStreams } from '../shared/test-helpers';

import { BusinessDirectoryService } from './business-directory.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockRedisStreams = createMockRedisStreams();
const mockRedis = createMockRedis();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_ID = 'owner-uuid-001';
const OTHER_ID = 'other-uuid-002';
const ADMIN_ID = 'admin-uuid-001';
const BIZ_ID = 'biz-uuid-001';

const mockBusiness = {
  id: BIZ_ID,
  ownerId: OWNER_ID,
  nameAr: 'متجر النخيل',
  nameEn: 'Palm Store',
  category: 'retail',
  verificationStatus: 'pending' as const,
  status: 'active',
  description: null,
  descriptionAr: null,
  district: 'kharga',
  location: null,
  phone: null,
  website: null,
  verifiedBy: null,
  verifiedAt: null,
  rejectionReason: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

const mockVerifiedBusiness = { ...mockBusiness, verificationStatus: 'verified' as const };

const mockLinkedCommodity = {
  id: 'commodity-uuid-001',
  nameAr: 'تمور',
  nameEn: 'Dates',
  category: 'fruits',
  unit: 'kg',
};

const createBusinessDto = {
  nameAr: 'متجر النخيل',
  nameEn: 'Palm Store',
  category: 'retail',
  district: 'kharga',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BusinessDirectoryService', () => {
  let service: BusinessDirectoryService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();

    mockRedisStreams.publish.mockResolvedValue('mock-stream-id');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.scan.mockResolvedValue(['0', []]);

    // Direct instantiation bypasses NestJS DI
    service = new BusinessDirectoryService(
      mockDb as never,
      mockRedis as never,
      mockRedisStreams as never,
    );
  });

  // -------------------------------------------------------------------------
  // assertOwnership
  // -------------------------------------------------------------------------

  describe('assertOwnership', () => {
    it('should return the business for the correct owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);

      const result = await service.assertOwnership(BIZ_ID, OWNER_ID);

      expect(result).toEqual(mockBusiness);
    });

    it('should throw NotFoundException when business is not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.assertOwnership(BIZ_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when userId does not match ownerId', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);

      await expect(service.assertOwnership(BIZ_ID, OTHER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('should insert business with verificationStatus=pending and return it', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);

      const result = await service.create(createBusinessDto as never, OWNER_ID);

      expect(result).toEqual(mockBusiness);
      expect(mockDb.transaction).toHaveBeenCalled();
      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      expect(valuesArg.verificationStatus).toBe('pending');
      expect(valuesArg.ownerId).toBe(OWNER_ID);
    });

    it('should link commodityIds in junction table within the same transaction', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);

      await service.create(
        {
          ...createBusinessDto,
          commodityIds: ['commodity-uuid-001', 'commodity-uuid-002'],
        } as never,
        OWNER_ID,
      );

      // insert called twice: once for business, once for junction table
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      const junctionValues = mockDb.values.mock.calls[1]![0] as {
        businessId: string;
        commodityId: string;
      }[];
      expect(junctionValues).toHaveLength(2);
      expect(junctionValues[0]).toMatchObject({
        businessId: BIZ_ID,
        commodityId: 'commodity-uuid-001',
      });
    });

    it('should NOT insert into junction table when commodityIds is absent', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);

      await service.create(createBusinessDto as never, OWNER_ID);

      // Only one insert: the business itself
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('should invalidate biz-dir cache after creation', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);
      const invalidateSpy = vi.spyOn(service, 'invalidateBizDirCache');

      await service.create(createBusinessDto as never, OWNER_ID);

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should throw when DB returns no rows (unexpected)', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.create(createBusinessDto as never, OWNER_ID)).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('should assert ownership before updating', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);
      const assertSpy = vi.spyOn(service, 'assertOwnership');

      await service.update(BIZ_ID, { phone: '+20 123 4567' } as never, OWNER_ID);

      expect(assertSpy).toHaveBeenCalledWith(BIZ_ID, OWNER_ID);
    });

    it('should return updated business', async () => {
      const updated = { ...mockBusiness, nameEn: 'Updated Store' };
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.update(BIZ_ID, { nameEn: 'Updated Store' } as never, OWNER_ID);

      expect(result).toEqual(updated);
    });

    it('should always include updatedAt in the update payload', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);

      await service.update(BIZ_ID, { phone: '+20 123 4567' } as never, OWNER_ID);

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.updatedAt).toBeInstanceOf(Date);
    });

    it('should reset verificationStatus to pending when a re-verification field is changed on a verified business', async () => {
      mockDb.limit.mockResolvedValueOnce([mockVerifiedBusiness]);
      mockDb.returning.mockResolvedValueOnce([
        { ...mockVerifiedBusiness, verificationStatus: 'pending' },
      ]);

      await service.update(BIZ_ID, { nameAr: 'اسم جديد' } as never, OWNER_ID);

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verificationStatus).toBe('pending');
      expect(setArg.verifiedBy).toBeNull();
      expect(setArg.verifiedAt).toBeNull();
      expect(setArg.rejectionReason).toBeNull();
    });

    it('should reset verificationStatus to pending when commodityIds change on a verified business', async () => {
      mockDb.limit.mockResolvedValueOnce([mockVerifiedBusiness]);
      mockDb.returning.mockResolvedValueOnce([
        { ...mockVerifiedBusiness, verificationStatus: 'pending' },
      ]);

      await service.update(BIZ_ID, { commodityIds: ['commodity-uuid-001'] } as never, OWNER_ID);

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verificationStatus).toBe('pending');
    });

    it('should NOT reset verificationStatus when only contact fields (phone, website) are changed', async () => {
      mockDb.limit.mockResolvedValueOnce([mockVerifiedBusiness]);
      mockDb.returning.mockResolvedValueOnce([mockVerifiedBusiness]);

      await service.update(
        BIZ_ID,
        { phone: '+20 123 4567', website: 'https://example.com' } as never,
        OWNER_ID,
      );

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verificationStatus).toBeUndefined();
    });

    it('should NOT reset verificationStatus when current status is already pending', async () => {
      // Already pending — re-verification field changed, but status shouldn't cycle again
      mockDb.limit.mockResolvedValueOnce([mockBusiness]); // verificationStatus: 'pending'
      mockDb.returning.mockResolvedValueOnce([mockBusiness]);

      await service.update(BIZ_ID, { nameAr: 'اسم آخر' } as never, OWNER_ID);

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verificationStatus).toBeUndefined();
    });

    it('should also reset status to pending when re-verification field changes on a rejected business', async () => {
      const rejectedBusiness = { ...mockBusiness, verificationStatus: 'rejected' as const };
      mockDb.limit.mockResolvedValueOnce([rejectedBusiness]);
      mockDb.returning.mockResolvedValueOnce([
        { ...rejectedBusiness, verificationStatus: 'pending' },
      ]);

      await service.update(BIZ_ID, { nameAr: 'اسم محسّن' } as never, OWNER_ID);

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verificationStatus).toBe('pending');
    });

    it('should delete old and insert new junction entries when commodityIds is provided', async () => {
      mockDb.limit.mockResolvedValueOnce([mockVerifiedBusiness]);
      mockDb.returning.mockResolvedValueOnce([mockVerifiedBusiness]);

      await service.update(BIZ_ID, { commodityIds: ['commodity-uuid-001'] } as never, OWNER_ID);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when caller is not the owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]); // ownerId = OWNER_ID

      await expect(service.update(BIZ_ID, { phone: '+20' } as never, OTHER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('should soft-delete by setting deletedAt', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]); // assertOwnership
      mockDb.returning.mockResolvedValueOnce([{ id: BIZ_ID }]); // remove update

      await expect(service.remove(BIZ_ID, OWNER_ID)).resolves.toBeUndefined();

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.deletedAt).toBeInstanceOf(Date);
    });

    it('should call assertOwnership before removing', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);
      mockDb.returning.mockResolvedValueOnce([{ id: BIZ_ID }]);
      const assertSpy = vi.spyOn(service, 'assertOwnership');

      await service.remove(BIZ_ID, OWNER_ID);

      expect(assertSpy).toHaveBeenCalledWith(BIZ_ID, OWNER_ID);
    });

    it('should throw ForbiddenException when caller is not the owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);

      await expect(service.remove(BIZ_ID, OTHER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when business row is gone after ownership check', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]); // assertOwnership passes
      mockDb.returning.mockResolvedValueOnce([]); // no row updated (concurrent delete)

      await expect(service.remove(BIZ_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should invalidate biz-dir cache after removal', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);
      mockDb.returning.mockResolvedValueOnce([{ id: BIZ_ID }]);
      const invalidateSpy = vi.spyOn(service, 'invalidateBizDirCache');

      await service.remove(BIZ_ID, OWNER_ID);

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('should throw NotFoundException when business is not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.findById(BIZ_ID)).rejects.toThrow(NotFoundException);
    });

    it('should return business with linked commodities', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);
      // 1st where: chainable for .limit(1); 2nd where: terminal for commodity query
      mockDb.where.mockReturnValueOnce(mockDb).mockResolvedValueOnce([mockLinkedCommodity]);

      const result = await service.findById(BIZ_ID);

      expect(result.id).toBe(BIZ_ID);
      expect(result.commodities).toHaveLength(1);
      expect(result.commodities[0]).toEqual(mockLinkedCommodity);
    });

    it('should query commodities via innerJoin on businessCommodities', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);

      await service.findById(BIZ_ID);

      expect(mockDb.innerJoin).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findAll — cache and visibility
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    const query = { offset: 0, limit: 10 };

    it('should return cached response without hitting DB on cache hit', async () => {
      const cached = {
        data: [{ ...mockVerifiedBusiness, commodities: [] }],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.findAll(query as never);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should query DB on cache miss and cache the result with 10-minute TTL', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.findAll(query as never);

      expect(mockDb.select).toHaveBeenCalled();
      await Promise.resolve(); // allow async cache write to flush
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('mkt:biz-dir:list:'),
        expect.any(String),
        'EX',
        600,
      );
    });

    it('should build a deterministic cache key sorted by param name', async () => {
      const cachedResult = { data: [], total: 0, page: 1, limit: 10, hasMore: false };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedResult));

      await service.findAll({
        category: 'retail',
        district: 'kharga',
        offset: 0,
        limit: 10,
      } as never);

      const cacheKey = mockRedis.get.mock.calls[0]![0] as string;
      expect(cacheKey).toContain('category=retail');
      expect(cacheKey).toContain('district=kharga');
    });
  });

  // -------------------------------------------------------------------------
  // findMine — owner visibility
  // -------------------------------------------------------------------------

  describe('findMine', () => {
    it('should return all own businesses regardless of verification status', async () => {
      const ownBusinesses = [
        mockBusiness,
        { ...mockBusiness, id: 'biz-uuid-002', verificationStatus: 'verified' as const },
      ];
      mockDb.orderBy.mockResolvedValueOnce(ownBusinesses);

      const result = await service.findMine(OWNER_ID);

      expect(result).toHaveLength(2);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return empty array when user has no businesses', async () => {
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await service.findMine(OWNER_ID);

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // findPending — admin queue
  // -------------------------------------------------------------------------

  describe('findPending', () => {
    it('should return paginated pending businesses with correct pagination shape', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBusiness]);

      const result = await service.findPending({ offset: 0, limit: 10 } as never);

      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return empty data when no pending businesses exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.findPending({ offset: 0, limit: 10 } as never);

      expect(result.data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // verify — state machine
  // -------------------------------------------------------------------------

  describe('verify', () => {
    it('should set verificationStatus=verified with verifiedBy and verifiedAt', async () => {
      const verifiedBiz = {
        ...mockBusiness,
        verificationStatus: 'verified' as const,
        verifiedBy: ADMIN_ID,
        verifiedAt: new Date(),
      };
      mockDb.returning.mockResolvedValueOnce([verifiedBiz]);

      const result = await service.verify(BIZ_ID, { status: 'verified' } as never, ADMIN_ID);

      expect(result.verificationStatus).toBe('verified');
      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verifiedBy).toBe(ADMIN_ID);
      expect(setArg.verifiedAt).toBeInstanceOf(Date);
      expect(setArg.rejectionReason).toBeNull();
    });

    it('should set verificationStatus=rejected with rejectionReason and clear verifiedBy', async () => {
      const rejectedBiz = {
        ...mockBusiness,
        verificationStatus: 'rejected' as const,
        rejectionReason: 'Invalid documentation',
      };
      mockDb.returning.mockResolvedValueOnce([rejectedBiz]);

      const result = await service.verify(
        BIZ_ID,
        { status: 'rejected', rejectionReason: 'Invalid documentation' } as never,
        ADMIN_ID,
      );

      expect(result.verificationStatus).toBe('rejected');
      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.rejectionReason).toBe('Invalid documentation');
      expect(setArg.verifiedBy).toBeNull();
      expect(setArg.verifiedAt).toBeNull();
    });

    it('should set verificationStatus=suspended without setting verifiedBy', async () => {
      const suspendedBiz = { ...mockBusiness, verificationStatus: 'suspended' as const };
      mockDb.returning.mockResolvedValueOnce([suspendedBiz]);

      const result = await service.verify(BIZ_ID, { status: 'suspended' } as never, ADMIN_ID);

      expect(result.verificationStatus).toBe('suspended');
      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.verifiedBy).toBeNull();
    });

    it('should emit business.verified event when status is verified', async () => {
      const verifiedBiz = { ...mockVerifiedBusiness, verifiedBy: ADMIN_ID, verifiedAt: new Date() };
      mockDb.returning.mockResolvedValueOnce([verifiedBiz]);

      await service.verify(BIZ_ID, { status: 'verified' } as never, ADMIN_ID);

      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        'business.verified',
        expect.objectContaining({ businessId: BIZ_ID }),
      );
    });

    it('should NOT emit event when status is rejected', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { ...mockBusiness, verificationStatus: 'rejected', rejectionReason: 'Bad docs' },
      ]);

      await service.verify(
        BIZ_ID,
        { status: 'rejected', rejectionReason: 'Bad docs' } as never,
        ADMIN_ID,
      );

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });

    it('should NOT emit event when status is suspended', async () => {
      mockDb.returning.mockResolvedValueOnce([
        { ...mockBusiness, verificationStatus: 'suspended' },
      ]);

      await service.verify(BIZ_ID, { status: 'suspended' } as never, ADMIN_ID);

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when business is not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.verify(BIZ_ID, { status: 'verified' } as never, ADMIN_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invalidate biz-dir cache after verification', async () => {
      mockDb.returning.mockResolvedValueOnce([mockVerifiedBusiness]);
      const invalidateSpy = vi.spyOn(service, 'invalidateBizDirCache');

      await service.verify(BIZ_ID, { status: 'verified' } as never, ADMIN_ID);

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
