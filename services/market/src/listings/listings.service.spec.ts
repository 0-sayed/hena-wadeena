import { EVENTS } from '@hena-wadeena/types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListingsService } from './listings.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockS3 = {
  getPresignedUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: 'https://s3.example.com/upload' }),
};

const mockRedisStreams = {
  publish: vi.fn().mockResolvedValue('mock-stream-id'),
};

/**
 * Chain-style mock for Drizzle query builder.
 * - `limit` returns the chain by default (chainable); override with
 *   `mockResolvedValueOnce` in tests that use limit as the terminal.
 * - `offset` resolves to [] by default (terminal for paginated queries).
 * - `returning` resolves to [] by default (terminal for insert/update).
 */
type MockFn = ReturnType<typeof vi.fn>;
interface MockDbChain {
  select: MockFn;
  from: MockFn;
  where: MockFn;
  limit: MockFn;
  offset: MockFn;
  insert: MockFn;
  values: MockFn;
  returning: MockFn;
  update: MockFn;
  set: MockFn;
  orderBy: MockFn;
}

function createMockDb(): MockDbChain {
  const chain = {} as MockDbChain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain); // chainable — override per test for terminal use
  chain.offset = vi.fn().mockResolvedValue([]); // terminal for paginated data queries
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue([]);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const mockListing = {
  id: 'listing-uuid-001',
  ownerId: 'owner-uuid-001',
  titleAr: 'شقة للبيع',
  titleEn: 'Apartment for Sale',
  slug: 'apartment-for-sale',
  status: 'active' as const,
  category: 'real_estate',
  listingType: 'real_estate',
  transaction: 'sale',
  price: 50000,
  priceUnit: 'EGP',
  priceRange: null,
  areaSqm: null,
  location: null,
  address: null,
  district: 'Al Kharga',
  description: null,
  subCategory: null,
  images: null,
  features: null,
  amenities: null,
  tags: null,
  contact: null,
  openingHours: null,
  isVerified: false,
  isFeatured: false,
  featuredUntil: null,
  isPublished: false,
  approvedBy: null,
  approvedAt: null,
  ratingAvg: 0,
  reviewCount: 0,
  viewsCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

// Minimal valid create DTO
const createDto = {
  titleAr: 'شقة للبيع',
  titleEn: 'Apartment for Sale',
  price: 50000,
  category: 'real_estate',
  listingType: 'real_estate',
  transaction: 'sale',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ListingsService', () => {
  let service: ListingsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    // Direct instantiation bypasses NestJS DI (Vitest uses ESBuild which doesn't
    // emit decorator metadata needed for type-based injection tokens).
    service = new ListingsService(mockDb as never, mockS3 as never, mockRedisStreams as never);
  });

  // -------------------------------------------------------------------------
  // buildFilters — private method, accessed via (service as any)
  // Drizzle's and() wraps conditions as: queryChunks = ["(", innerSQL, ")"]
  // innerSQL.queryChunks.length = 2n-1 where n = number of conditions.
  // More conditions → longer inner queryChunks.
  // -------------------------------------------------------------------------

  describe('buildFilters', () => {
    const getFilters = (query: Record<string, unknown> = {}) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      (service as any).buildFilters({ offset: 0, limit: 20, ...query });

    // Helper: count logical conditions inside the and() result

    const conditionCount = (sql: any): number =>
      Math.ceil(sql.queryChunks[1].queryChunks.length / 2);

    it('should always return a SQL expression (base: isNull + status=active)', () => {
      const filters = getFilters();
      expect(filters).toBeDefined();
      expect(conditionCount(filters)).toBe(2);
    });

    it('should add a condition for category filter', () => {
      const base = conditionCount(getFilters());
      const withCategory = conditionCount(getFilters({ category: 'real_estate' }));
      expect(withCategory).toBeGreaterThan(base);
    });

    it('should add a condition for sub_category filter', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ sub_category: 'apartments' }))).toBeGreaterThan(base);
    });

    it('should add a condition for listing_type filter', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ listing_type: 'for_sale' }))).toBeGreaterThan(base);
    });

    it('should add a condition for area filter (maps to district column)', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ area: 'Al Kharga' }))).toBeGreaterThan(base);
    });

    it('should add a condition for min_price=0 (zero-value edge case — must use !== undefined)', () => {
      const base = conditionCount(getFilters());
      // min_price=0 is falsy but !== undefined — must be included
      expect(conditionCount(getFilters({ min_price: 0 }))).toBeGreaterThan(base);
    });

    it('should NOT add a condition when min_price is undefined', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ min_price: undefined }))).toBe(base);
    });

    it('should add a condition for max_price filter', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ max_price: 100000 }))).toBeGreaterThan(base);
    });

    it('should add a condition for is_verified filter', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ is_verified: true }))).toBeGreaterThan(base);
    });

    it('should add a condition for is_featured filter', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ is_featured: false }))).toBeGreaterThan(base);
    });

    it('should add a condition for tags filter (comma-separated AND semantics)', () => {
      const base = conditionCount(getFilters());
      expect(conditionCount(getFilters({ tags: 'furnished,sea_view' }))).toBeGreaterThan(base);
    });

    it('should add multiple conditions when multiple filters are combined', () => {
      const base = conditionCount(getFilters());
      const combined = conditionCount(
        getFilters({
          category: 'real_estate',
          min_price: 10000,
          max_price: 100000,
          area: 'Al Kharga',
        }),
      );
      // base + 4 filters → 4 more conditions
      expect(combined).toBe(base + 4);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('should generate a slug from titleEn and insert listing with status=draft', async () => {
      mockDb.returning.mockResolvedValueOnce([mockListing]);

      const result = await service.create(createDto as never, 'owner-uuid-001');

      expect(result).toEqual(mockListing);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'owner-uuid-001',
          status: 'draft',
          slug: expect.stringContaining('apartment-for-sale'),
        }),
      );
    });

    it('should fall back to titleAr for slug when titleEn is not provided', async () => {
      mockDb.returning.mockResolvedValueOnce([mockListing]);
      const dtoArabicOnly = { ...createDto, titleEn: undefined };

      await service.create(dtoArabicOnly as never, 'owner-uuid-001');

      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      expect(typeof valuesArg.slug).toBe('string');
      expect((valuesArg.slug as string).length).toBeGreaterThan(0);
    });

    it('should append a suffix to the slug on collision', async () => {
      // First where() call returns an existing slug → collision
      mockDb.where.mockResolvedValueOnce([{ slug: 'apartment-for-sale' }]);
      const collisionResult = { ...mockListing, slug: 'apartment-for-sale-abc123' };
      mockDb.returning.mockResolvedValueOnce([collisionResult]);

      const result = await service.create(createDto as never, 'owner-uuid-001');

      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      expect(valuesArg.slug).not.toBe('apartment-for-sale');
      expect(result.slug).toMatch(/^apartment-for-sale-/);
    });

    it('should emit listing.created event with correct payload', async () => {
      mockDb.returning.mockResolvedValueOnce([mockListing]);

      await service.create(createDto as never, 'owner-uuid-001');

      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        EVENTS.LISTING_CREATED,
        expect.objectContaining({
          listingId: mockListing.id,
          titleAr: mockListing.titleAr,
          titleEn: mockListing.titleEn,
          category: mockListing.category,
          district: mockListing.district,
          ownerId: mockListing.ownerId,
          status: mockListing.status,
        }),
      );
    });

    it('should transform { lat, lng } location to a PostGIS SQL expression', async () => {
      const dtoWithLocation = { ...createDto, location: { lat: 25.44, lng: 30.56 } };
      mockDb.returning.mockResolvedValueOnce([mockListing]);

      await service.create(dtoWithLocation as never, 'owner-uuid-001');

      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      // location must NOT be the raw { lat, lng } object — it's converted to an SQL expression
      expect(valuesArg.location).not.toEqual({ lat: 25.44, lng: 30.56 });
      expect(valuesArg.location).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // assertOwnership
  // -------------------------------------------------------------------------

  describe('assertOwnership', () => {
    it('should return the listing when caller is the owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockListing]);

      const result = await service.assertOwnership(mockListing.id, mockListing.ownerId);

      expect(result).toEqual(mockListing);
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.assertOwnership('nonexistent-id', 'any-caller')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when caller is not the owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockListing]);

      await expect(service.assertOwnership(mockListing.id, 'different-user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById — owner visibility logic
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('should return an active listing to any caller', async () => {
      mockDb.limit.mockResolvedValueOnce([mockListing]);

      const result = await service.findById(mockListing.id);

      expect(result).toEqual(mockListing);
    });

    it('should return null when listing does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return a draft listing to its owner', async () => {
      const draftListing = { ...mockListing, status: 'draft' as const };
      mockDb.limit.mockResolvedValueOnce([draftListing]);

      const result = await service.findById(draftListing.id, draftListing.ownerId);

      expect(result).toEqual(draftListing);
    });

    it('should return null for a draft listing when caller is not the owner', async () => {
      const draftListing = { ...mockListing, status: 'draft' as const };
      mockDb.limit.mockResolvedValueOnce([draftListing]);

      const result = await service.findById(draftListing.id, 'different-user-id');

      expect(result).toBeNull();
    });

    it('should return null for a draft listing on unauthenticated (public) access', async () => {
      const draftListing = { ...mockListing, status: 'draft' as const };
      mockDb.limit.mockResolvedValueOnce([draftListing]);

      const result = await service.findById(draftListing.id);

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findAll — pagination
  // -------------------------------------------------------------------------

  describe('findAll pagination', () => {
    beforeEach(() => {
      // Spy on countListings to avoid the count query's .where() terminal complexity

      vi.spyOn(service as any, 'countListings').mockResolvedValue(50);
    });

    it('should return page=1 for offset=0 with limit=20', async () => {
      mockDb.offset.mockResolvedValueOnce([mockListing]);

      const result = await service.findAll({ offset: 0, limit: 20 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should compute page correctly from offset and limit', async () => {
      mockDb.offset.mockResolvedValueOnce([]);

      // offset=20, limit=10 → Math.floor(20/10) + 1 = 3
      const result = await service.findAll({ offset: 20, limit: 10 });

      expect(result.page).toBe(3);
    });

    it('should report hasMore=true when more results exist beyond current page', async () => {
      mockDb.offset.mockResolvedValueOnce([mockListing]);

      // total=50, offset=0, limit=20 → offset+limit=20 < 50
      const result = await service.findAll({ offset: 0, limit: 20 });

      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it('should report hasMore=false when all results are on the current page', async () => {
      vi.spyOn(service as any, 'countListings').mockResolvedValue(15);
      mockDb.offset.mockResolvedValueOnce([mockListing]);

      // total=15, offset=0, limit=20 → offset+limit=20 >= 15
      const result = await service.findAll({ offset: 0, limit: 20 });

      expect(result.hasMore).toBe(false);
    });

    it('should include result data in the response', async () => {
      mockDb.offset.mockResolvedValueOnce([mockListing]);

      const result = await service.findAll({ offset: 0, limit: 20 });

      expect(result.data).toEqual([mockListing]);
    });

    it('should report hasMore=false on the last page (exact fit)', async () => {
      vi.spyOn(service as any, 'countListings').mockResolvedValue(20);
      mockDb.offset.mockResolvedValueOnce([]);

      // total=20, offset=0, limit=20 → offset+limit=20 >= 20
      const result = await service.findAll({ offset: 0, limit: 20 });

      expect(result.hasMore).toBe(false);
    });
  });
});
