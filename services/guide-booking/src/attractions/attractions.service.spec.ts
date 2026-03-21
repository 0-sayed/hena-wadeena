import type { S3Service } from '@hena-wadeena/nest-common';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AttractionsService } from './attractions.service';
import type { CreateAttractionDto, UpdateAttractionDto, UploadUrlDto } from './dto';

/**
 * Chain mock for Drizzle query builder. All methods return the same chain so
 * queries can be chained arbitrarily. The chain is thenable so `await chain`
 * resolves via `chain.then()` — use mockImplementationOnce to control each
 * successive awaited query result.
 */
type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn>;
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

  // Make chain thenable so `await chain` works
  chain.then = vi
    .fn()
    .mockImplementation((onFulfilled: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(onFulfilled),
    );

  return chain;
}

const mockAttraction = {
  id: 'attraction-uuid-1',
  nameAr: 'واحة الخارجة',
  nameEn: 'Kharga Oasis',
  slug: 'kharga-oasis',
  type: 'natural' as const,
  area: 'kharga' as const,
  descriptionAr: null,
  descriptionEn: null,
  historyAr: null,
  bestSeason: null,
  bestTimeOfDay: null,
  entryFee: null,
  openingHours: null,
  durationHours: null,
  difficulty: null,
  tips: null,
  nearbySlugs: null,
  location: { x: 30.55, y: 25.44 },
  images: null,
  thumbnail: null,
  isActive: true,
  isFeatured: false,
  ratingAvg: null,
  reviewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const baseFilters = { page: 1, limit: 20, radiusKm: 25 };

describe('AttractionsService', () => {
  let service: AttractionsService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockS3: S3Service;
  let mockGetPresignedUploadUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockGetPresignedUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: 'https://s3.example.com/signed',
      key: 'attractions/attraction-uuid-1/uuid-photo.jpg',
      expiresAt: '2026-03-16T00:00:00.000Z',
    });
    mockS3 = {
      getPresignedUploadUrl: mockGetPresignedUploadUrl,
    } as unknown as S3Service;

    service = new AttractionsService(mockDb as any, mockS3);
  });

  // ------------------------------------------------------------------ create
  describe('create', () => {
    it('success: insert called with generated slug and correct values', async () => {
      // generateUniqueSlug query: no existing slugs
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      // insert .returning(): new attraction
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockAttraction]).then(resolve),
      );

      const dto: CreateAttractionDto = {
        nameAr: 'واحة الخارجة',
        nameEn: 'Kharga Oasis',
        type: 'natural',
        area: 'kharga',
        isActive: true,
        isFeatured: false,
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockAttraction);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ slug: 'kharga-oasis' }));
    });

    it('slug collision: appends -2 when slug exists', async () => {
      // generateUniqueSlug query: base slug already taken
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ slug: 'kharga-oasis' }]).then(resolve),
      );
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ ...mockAttraction, slug: 'kharga-oasis-2' }]).then(resolve),
      );

      const dto: CreateAttractionDto = {
        nameAr: 'واحة الخارجة',
        nameEn: 'Kharga Oasis',
        type: 'natural',
        area: 'kharga',
        isActive: true,
        isFeatured: false,
      };

      await service.create(dto);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'kharga-oasis-2' }),
      );
    });
  });

  // ------------------------------------------------------------------ findAll
  describe('findAll', () => {
    it('no filters: returns paginated active attractions', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([mockAttraction]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ count: 1 }]).then(resolve),
        );

      const result = await service.findAll(baseFilters);
      expect(result.data).toEqual([mockAttraction]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('with type/area filter: WHERE clause built and passed to query', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ count: 0 }]).then(resolve),
        );

      await service.findAll({ ...baseFilters, type: 'historical', area: 'kharga' });
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('with geo filter: where called with ST_DWithin conditions', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([mockAttraction]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ count: 1 }]).then(resolve),
        );

      const result = await service.findAll({ ...baseFilters, nearLat: 25.44, nearLng: 30.55 });
      expect(mockDb.where).toHaveBeenCalled();
      expect(result.data).toEqual([mockAttraction]);
    });
  });

  // --------------------------------------------------------------- findBySlug
  describe('findBySlug', () => {
    it('found: returns attraction', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockAttraction]).then(resolve),
      );
      const result = await service.findBySlug('kharga-oasis');
      expect(result).toEqual(mockAttraction);
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // --------------------------------------------------------------- findNearby
  describe('findNearby', () => {
    it('with coordinates: queries nearby with ST_DWithin + ST_Distance ordering', async () => {
      // findBySlug
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([mockAttraction]).then(resolve),
      );
      // nearby results
      const nearbyAttraction = { ...mockAttraction, id: 'nearby-uuid' };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([nearbyAttraction]).then(resolve),
      );

      const result = await service.findNearby('kharga-oasis', 5, 50);
      expect(result).toEqual([nearbyAttraction]);
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('no coordinates: returns empty array without second DB call', async () => {
      const noLocAttraction = { ...mockAttraction, location: null };
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([noLocAttraction]).then(resolve),
      );

      const result = await service.findNearby('kharga-oasis');
      expect(result).toEqual([]);
      // Only one DB call (findBySlug), no second query
      expect(mockDb.then).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------ update
  describe('update', () => {
    it('success: partial update + updated_at set', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ ...mockAttraction, nameEn: 'Updated Oasis' }]).then(resolve),
      );

      const dto: UpdateAttractionDto = { nameEn: 'Updated Oasis' };
      const result = await service.update(mockAttraction.id, dto);
      expect(result).toMatchObject({ nameEn: 'Updated Oasis' });
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      );
    });

    it('not found: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  // --------------------------------------------------------------- softDelete
  describe('softDelete', () => {
    it('success: sets deleted_at via update', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: mockAttraction.id }]).then(resolve),
      );

      const result = await service.softDelete(mockAttraction.id);
      expect(result).toEqual({ message: 'Attraction deleted' });
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date), updatedAt: expect.any(Date) }),
      );
    });

    it('already deleted: throws NotFoundException', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(resolve),
      );
      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------- getUploadUrl
  describe('getUploadUrl', () => {
    it('S3Service called with correct key pattern attractions/{id}/{uuid}-{filename}', async () => {
      mockDb.then.mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve([{ id: mockAttraction.id }]).then(resolve),
      );

      const dto: UploadUrlDto = { contentType: 'image/jpeg', filename: 'photo.jpg' };
      await service.getUploadUrl(mockAttraction.id, dto);

      expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
          key: expect.stringMatching(/^attractions\/attraction-uuid-1\/.+-photo\.jpg$/),
        }),
      );
    });
  });

  // ------------------------------------------------------------ adminFindAll
  describe('adminFindAll', () => {
    it('includes inactive/deleted: returns paginated results without forced active filter', async () => {
      mockDb.then
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([mockAttraction]).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: unknown[]) => unknown) =>
          Promise.resolve([{ count: 1 }]).then(resolve),
        );

      const result = await service.adminFindAll(baseFilters);
      expect(result.data).toEqual([mockAttraction]);
      expect(result.total).toBe(1);
    });
  });
});
