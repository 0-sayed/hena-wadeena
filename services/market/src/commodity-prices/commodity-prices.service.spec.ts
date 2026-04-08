import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedis, createMockRedisStreams } from '../shared/test-helpers';

import { CommodityPricesService } from './commodity-prices.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockRedisStreams = createMockRedisStreams();
const mockRedis = createMockRedis();
const mockPriceAlertsService = {
  evaluateForCommodity: vi.fn().mockResolvedValue(undefined),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockCommodity = {
  id: 'commodity-uuid-001',
  nameAr: 'تمور',
  nameEn: 'Dates',
  category: 'fruits',
  unit: 'kg',
  iconUrl: null,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPrice = {
  id: 'price-uuid-001',
  commodityId: 'commodity-uuid-001',
  price: 1500,
  priceType: 'wholesale',
  region: 'kharga',
  source: null,
  notes: null,
  recordedAt: new Date('2026-01-15'),
  recordedBy: 'admin-uuid-001',
  createdAt: new Date('2026-01-15'),
  deletedAt: null,
};

const createCommodityDto = {
  nameAr: 'تمور',
  nameEn: 'Dates',
  category: 'fruits',
  unit: 'kg',
};

const createPriceDto = {
  commodityId: 'commodity-uuid-001',
  price: 1500,
  priceType: 'wholesale',
  region: 'kharga',
  recordedAt: '2026-01-15T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommodityPricesService', () => {
  let service: CommodityPricesService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();

    // Restore defaults after clearAllMocks (vi.clearAllMocks preserves implementations
    // for module-level mocks, but we re-apply for safety)
    mockRedisStreams.publish.mockResolvedValue('mock-stream-id');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.scan.mockResolvedValue(['0', []]);
    mockPriceAlertsService.evaluateForCommodity.mockResolvedValue(undefined);

    // Direct instantiation bypasses NestJS DI (Vitest uses ESBuild which doesn't
    // emit decorator metadata needed for type-based injection tokens).
    service = new CommodityPricesService(
      mockDb as never,
      mockRedis as never,
      mockRedisStreams as never,
      mockPriceAlertsService as never,
    );
  });

  // -------------------------------------------------------------------------
  // createCommodity
  // -------------------------------------------------------------------------

  describe('createCommodity', () => {
    it('should insert a commodity and return it', async () => {
      mockDb.returning.mockResolvedValueOnce([mockCommodity]);

      const result = await service.createCommodity(createCommodityDto as never, 'admin-uuid-001');

      expect(result).toEqual(mockCommodity);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          nameAr: 'تمور',
          category: 'fruits',
          unit: 'kg',
        }),
      );
    });

    it('should throw when DB returns no rows (unexpected)', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.createCommodity(createCommodityDto as never, 'admin-uuid-001'),
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // updateCommodity
  // -------------------------------------------------------------------------

  describe('updateCommodity', () => {
    it('should update and return the updated commodity', async () => {
      const updated = { ...mockCommodity, nameEn: 'Premium Dates' };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.updateCommodity('commodity-uuid-001', {
        nameEn: 'Premium Dates',
      } as never);

      expect(result).toEqual(updated);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should always include updatedAt in the update payload', async () => {
      mockDb.returning.mockResolvedValueOnce([mockCommodity]);

      await service.updateCommodity('commodity-uuid-001', { nameEn: 'X' } as never);

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when commodity does not exist', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.updateCommodity('nonexistent-id', { nameEn: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invalidate commodity cache after update', async () => {
      mockDb.returning.mockResolvedValueOnce([mockCommodity]);
      const invalidateSpy = vi.spyOn(service as never, 'invalidateCommodityCache');

      await service.updateCommodity('commodity-uuid-001', { nameEn: 'X' } as never);

      expect(invalidateSpy).toHaveBeenCalledWith('commodity-uuid-001');
    });
  });

  // -------------------------------------------------------------------------
  // deactivateCommodity
  // -------------------------------------------------------------------------

  describe('deactivateCommodity', () => {
    it('should set isActive to false', async () => {
      const deactivated = { ...mockCommodity, isActive: false };
      mockDb.returning.mockResolvedValueOnce([deactivated]);

      const result = await service.deactivateCommodity('commodity-uuid-001');

      expect(result.isActive).toBe(false);
      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.isActive).toBe(false);
    });

    it('should throw NotFoundException when commodity does not exist', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.deactivateCommodity('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should invalidate commodity cache after deactivation', async () => {
      mockDb.returning.mockResolvedValueOnce([{ ...mockCommodity, isActive: false }]);
      const invalidateSpy = vi.spyOn(service as never, 'invalidateCommodityCache');

      await service.deactivateCommodity('commodity-uuid-001');

      expect(invalidateSpy).toHaveBeenCalledWith('commodity-uuid-001');
    });
  });

  // -------------------------------------------------------------------------
  // findAllCommodities
  // -------------------------------------------------------------------------

  describe('findAllCommodities', () => {
    it('should return active commodities', async () => {
      mockDb.orderBy.mockResolvedValueOnce([mockCommodity]);

      const result = await service.findAllCommodities();

      expect(result).toEqual([mockCommodity]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array when no active commodities', async () => {
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await service.findAllCommodities();

      expect(result).toEqual([]);
    });

    it('should apply category filter when provided', async () => {
      mockDb.orderBy.mockResolvedValueOnce([mockCommodity]);

      await service.findAllCommodities({ category: 'fruits' });

      // where() is called, meaning the filter condition was built
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findCommodityById
  // -------------------------------------------------------------------------

  describe('findCommodityById', () => {
    it('should return cached result without hitting DB on cache hit', async () => {
      const cachedResult = { ...mockCommodity, latestPricesByRegion: [] };
      const serialized = JSON.stringify(cachedResult);
      mockRedis.get.mockResolvedValueOnce(serialized);

      const result = await service.findCommodityById('commodity-uuid-001');

      // JSON.parse converts Date → string; compare via re-parsed expected value
      expect(result).toEqual(JSON.parse(serialized));
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should query DB and cache result on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.limit.mockResolvedValueOnce([mockCommodity]);
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.findCommodityById('commodity-uuid-001');

      expect(result).toMatchObject({ ...mockCommodity, latestPricesByRegion: [] });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'mkt:commodity:commodity-uuid-001',
        expect.any(String),
        'EX',
        1800,
      );
    });

    it('should throw NotFoundException when commodity is not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.findCommodityById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should include latestPricesByRegion from raw SQL in the result', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.limit.mockResolvedValueOnce([mockCommodity]);
      const priceRow = {
        id: 'price-uuid-001',
        price: 1500,
        price_type: 'wholesale',
        region: 'kharga',
        recorded_at: new Date('2026-01-15'),
      };
      mockDb.execute.mockResolvedValueOnce([priceRow]);

      const result = (await service.findCommodityById('commodity-uuid-001')) as Record<
        string,
        unknown
      >;

      expect(result.latestPricesByRegion).toHaveLength(1);
      expect((result.latestPricesByRegion as unknown[])[0]).toEqual(priceRow);
    });
  });

  // -------------------------------------------------------------------------
  // createPrice
  // -------------------------------------------------------------------------

  describe('createPrice', () => {
    it('should insert price entry and return it', async () => {
      mockDb.returning.mockResolvedValueOnce([mockPrice]);
      mockDb.limit.mockResolvedValueOnce([{ nameAr: 'تمور' }]);

      const result = await service.createPrice(createPriceDto as never, 'admin-uuid-001');

      expect(result).toEqual(mockPrice);
      expect(mockDb.insert).toHaveBeenCalled();

      // evaluateForCommodity is fire-and-forget; the promise resolves after test assertion
      // so we just verify the call was made eventually:
      await vi.waitFor(() => {
        expect(mockPriceAlertsService.evaluateForCommodity).toHaveBeenCalledWith(
          'commodity-uuid-001',
          1500,
          expect.any(Date),
        );
      });
    });

    it('should set recordedBy to adminId', async () => {
      mockDb.returning.mockResolvedValueOnce([mockPrice]);
      mockDb.limit.mockResolvedValueOnce([{ nameAr: 'تمور' }]);

      await service.createPrice(createPriceDto as never, 'admin-uuid-001');

      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      expect(valuesArg.recordedBy).toBe('admin-uuid-001');
    });

    it('should emit commodity_price.updated event with string price', async () => {
      mockDb.returning.mockResolvedValueOnce([mockPrice]);
      mockDb.limit.mockResolvedValueOnce([{ nameAr: 'تمور' }]);

      await service.createPrice(createPriceDto as never, 'admin-uuid-001');

      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        'commodity_price.updated',
        expect.objectContaining({
          commodityId: 'commodity-uuid-001',
          region: 'kharga',
          price: '1500', // numeric values stringified for event payload
          priceType: 'wholesale',
        }),
      );
    });

    it('should call invalidatePriceCache on successful create', async () => {
      mockDb.returning.mockResolvedValueOnce([mockPrice]);
      mockDb.limit.mockResolvedValueOnce([{ nameAr: 'تمور' }]);
      const invalidateSpy = vi.spyOn(service as never, 'invalidatePriceCache');

      await service.createPrice(createPriceDto as never, 'admin-uuid-001');

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should throw ConflictException on unique constraint violation (code 23505)', async () => {
      mockDb.returning.mockRejectedValueOnce({ code: '23505', message: 'unique_violation' });

      await expect(service.createPrice(createPriceDto as never, 'admin-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should re-throw non-unique DB errors', async () => {
      mockDb.returning.mockRejectedValueOnce(new Error('connection timeout'));

      await expect(service.createPrice(createPriceDto as never, 'admin-uuid-001')).rejects.toThrow(
        'connection timeout',
      );
    });
  });

  // -------------------------------------------------------------------------
  // batchCreatePrices
  // -------------------------------------------------------------------------

  describe('batchCreatePrices', () => {
    const batchDto = {
      entries: [
        {
          commodityId: 'commodity-uuid-001',
          price: 1500,
          priceType: 'wholesale',
          region: 'kharga',
        },
        { commodityId: 'commodity-uuid-001', price: 1600, priceType: 'retail', region: 'dakhla' },
      ],
      recordedAt: '2026-01-15T00:00:00.000Z',
      source: 'Market Survey',
    };

    it('should wrap inserts in a DB transaction', async () => {
      const entries = [mockPrice, { ...mockPrice, id: 'price-uuid-002', region: 'dakhla' }];
      mockDb.returning.mockResolvedValueOnce(entries);
      // Batched commodity name lookup (single query via inArray)
      mockDb.where.mockResolvedValueOnce([{ id: 'commodity-uuid-001', nameAr: 'تمور' }]);

      await service.batchCreatePrices(batchDto as never, 'admin-uuid-001');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should return all created entries', async () => {
      const entries = [mockPrice, { ...mockPrice, id: 'price-uuid-002', region: 'dakhla' }];
      mockDb.returning.mockResolvedValueOnce(entries);
      // Batched commodity name lookup (single query via inArray)
      mockDb.where.mockResolvedValueOnce([{ id: 'commodity-uuid-001', nameAr: 'تمور' }]);

      const result = await service.batchCreatePrices(batchDto as never, 'admin-uuid-001');

      expect(result).toHaveLength(2);
    });

    it('should throw ConflictException on unique violation within the transaction', async () => {
      mockDb.returning.mockRejectedValueOnce({ code: '23505' });

      await expect(service.batchCreatePrices(batchDto as never, 'admin-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should call invalidatePriceCache after successful batch', async () => {
      const entries = [mockPrice];
      mockDb.returning.mockResolvedValueOnce(entries);
      // Batched commodity name lookup (single query via inArray)
      mockDb.where.mockResolvedValueOnce([{ id: 'commodity-uuid-001', nameAr: 'تمور' }]);
      const invalidateSpy = vi.spyOn(service as never, 'invalidatePriceCache');

      await service.batchCreatePrices(
        { ...batchDto, entries: [batchDto.entries[0]!] } as never,
        'admin-uuid-001',
      );

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should call evaluateForCommodity once per unique commodity in the batch', async () => {
      const entries = [
        mockPrice,
        { ...mockPrice, id: 'price-uuid-002', commodityId: 'commodity-uuid-002', price: 2000 },
      ];
      mockDb.returning.mockResolvedValueOnce(entries);
      mockDb.where.mockResolvedValueOnce([
        { id: 'commodity-uuid-001', nameAr: 'تمور' },
        { id: 'commodity-uuid-002', nameAr: 'قمح' },
      ]);

      await service.batchCreatePrices(batchDto as never, 'admin-uuid-001');

      await vi.waitFor(() => {
        expect(mockPriceAlertsService.evaluateForCommodity).toHaveBeenCalledTimes(2);
      });
      expect(mockPriceAlertsService.evaluateForCommodity).toHaveBeenCalledWith(
        'commodity-uuid-001',
        expect.any(Number),
        expect.any(Date),
      );
      expect(mockPriceAlertsService.evaluateForCommodity).toHaveBeenCalledWith(
        'commodity-uuid-002',
        expect.any(Number),
        expect.any(Date),
      );
    });

    it('should deduplicate evaluateForCommodity calls for the same commodity', async () => {
      const entries = [mockPrice, { ...mockPrice, id: 'price-uuid-002', region: 'dakhla' }];
      mockDb.returning.mockResolvedValueOnce(entries);
      mockDb.where.mockResolvedValueOnce([{ id: 'commodity-uuid-001', nameAr: 'تمور' }]);

      await service.batchCreatePrices(batchDto as never, 'admin-uuid-001');

      await vi.waitFor(() => {
        expect(mockPriceAlertsService.evaluateForCommodity).toHaveBeenCalledTimes(1);
      });
      expect(mockPriceAlertsService.evaluateForCommodity).toHaveBeenCalledWith(
        'commodity-uuid-001',
        expect.any(Number),
        expect.any(Date),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updatePrice
  // -------------------------------------------------------------------------

  describe('updatePrice', () => {
    it('should update and return the updated price', async () => {
      const updated = { ...mockPrice, price: 1600 };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.updatePrice('price-uuid-001', { price: 1600 });

      expect(result).toEqual(updated);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when price entry is not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.updatePrice('nonexistent-id', { price: 1600 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call invalidatePriceCache on successful update', async () => {
      mockDb.returning.mockResolvedValueOnce([mockPrice]);
      const invalidateSpy = vi.spyOn(service as never, 'invalidatePriceCache');

      await service.updatePrice('price-uuid-001', { price: 1600 });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deletePrice
  // -------------------------------------------------------------------------

  describe('deletePrice', () => {
    it('should soft-delete by setting deletedAt', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'price-uuid-001' }]);

      await expect(service.deletePrice('price-uuid-001')).resolves.toBeUndefined();

      const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
      expect(setArg.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when price entry is not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.deletePrice('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should call invalidatePriceCache on successful delete', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'price-uuid-001' }]);
      const invalidateSpy = vi.spyOn(service as never, 'invalidatePriceCache');

      await service.deletePrice('price-uuid-001');

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getPriceIndex — cache hit, cache miss, computation
  // -------------------------------------------------------------------------

  describe('getPriceIndex', () => {
    const query = { offset: 0, limit: 20 };

    it('should return cached response on cache hit without hitting DB', async () => {
      const cachedResponse = {
        data: [
          {
            commodity: {
              id: 'commodity-uuid-001',
              nameAr: 'تمور',
              nameEn: 'Dates',
              unit: 'kg',
              category: 'fruits',
            },
            latestPrice: 1500,
            previousPrice: 1400,
            changePiasters: 100,
            changePercent: 7.14,
            region: 'kharga',
            priceType: 'wholesale',
            recordedAt: new Date('2026-01-15').toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedResponse));

      const result = await service.getPriceIndex(query as never);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should call db.execute on cache miss and return PaginatedResponse', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const rawRow = {
        commodity_id: 'commodity-uuid-001',
        name_ar: 'تمور',
        name_en: 'Dates',
        unit: 'kg',
        category: 'fruits',
        latest_price: 1500,
        previous_price: 1400,
        price_type: 'wholesale',
        region: 'kharga',
        recorded_at: new Date('2026-01-15'),
      };
      // First execute = COUNT query, second = data query
      mockDb.execute.mockResolvedValueOnce([{ count: 1 }]);
      mockDb.execute.mockResolvedValueOnce([rawRow]);

      const result = await service.getPriceIndex(query as never);

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should compute changePiasters and changePercent from latest and previous prices', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.execute.mockResolvedValueOnce([{ count: 1 }]);
      mockDb.execute.mockResolvedValueOnce([
        {
          commodity_id: 'c1',
          name_ar: 'قمح',
          name_en: null,
          unit: 'ton',
          category: 'grains',
          latest_price: 2000,
          previous_price: 1600,
          price_type: 'wholesale',
          region: 'kharga',
          recorded_at: new Date('2026-01-15'),
        },
      ]);

      const result = await service.getPriceIndex(query as never);
      const item = result.data[0] as Record<string, unknown>;

      expect(item.changePiasters).toBe(400); // 2000 - 1600
      expect(item.changePercent).toBe(25); // (400 / 1600) * 100
    });

    it('should return null changePiasters and changePercent when no previous price exists', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.execute.mockResolvedValueOnce([{ count: 1 }]);
      mockDb.execute.mockResolvedValueOnce([
        {
          commodity_id: 'c1',
          name_ar: 'قمح',
          name_en: null,
          unit: 'ton',
          category: 'grains',
          latest_price: 2000,
          previous_price: null,
          price_type: 'wholesale',
          region: 'kharga',
          recorded_at: new Date('2026-01-15'),
        },
      ]);

      const result = await service.getPriceIndex(query as never);
      const item = result.data[0] as Record<string, unknown>;

      expect(item.changePiasters).toBeNull();
      expect(item.changePercent).toBeNull();
    });

    it('should paginate correctly with offset and limit', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      // DB-level: COUNT returns 3 total, data query returns the 2-row slice
      mockDb.execute.mockResolvedValueOnce([{ count: 3 }]);
      const pageRows = Array.from({ length: 2 }, (_, i) => ({
        commodity_id: `c${i + 1}`,
        name_ar: `commodity-${i + 1}`,
        name_en: null,
        unit: 'kg',
        category: 'fruits',
        latest_price: 1100 + i * 100,
        previous_price: null,
        price_type: 'wholesale',
        region: 'kharga',
        recorded_at: new Date('2026-01-15'),
      }));
      mockDb.execute.mockResolvedValueOnce(pageRows);

      const result = await service.getPriceIndex({ offset: 1, limit: 2 } as never);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1); // Math.floor(1/2) + 1 = 1
      expect(result.hasMore).toBe(false); // offset+limit = 3 >= total = 3
    });

    it('should cache the computed result for 1 hour', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockDb.execute.mockResolvedValueOnce([{ count: 0 }]);
      mockDb.execute.mockResolvedValueOnce([]);

      await service.getPriceIndex(query as never);
      // Allow async cache write to flush
      await Promise.resolve();

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('mkt:price-index:'),
        expect.any(String),
        'EX',
        3600,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getPriceSummary — cache delegation
  // -------------------------------------------------------------------------

  describe('getPriceSummary', () => {
    it('should return cached summary without hitting DB on cache hit', async () => {
      const cached = {
        totalCommodities: 5,
        totalPriceEntries: 20,
        lastUpdated: null,
        topMovers: [],
        categoryAverages: [],
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.getPriceSummary();

      expect(result).toEqual(cached);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should call db.execute on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      // 3 execute calls: summary scalars, topMovers, categoryAverages
      mockDb.execute
        .mockResolvedValueOnce([
          { total_commodities: '2', total_price_entries: '10', last_updated: new Date() },
        ])
        .mockResolvedValueOnce([]) // topMovers
        .mockResolvedValueOnce([]); // categoryAverages

      const result = (await service.getPriceSummary()) as Record<string, unknown>;

      expect(mockDb.execute).toHaveBeenCalledTimes(3);
      expect(result.totalCommodities).toBe(2);
      expect(result.totalPriceEntries).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // getPriceHistory — delegates to raw SQL
  // -------------------------------------------------------------------------

  describe('getPriceHistory', () => {
    const historyQuery = { period: '30d' as const };

    it('should throw NotFoundException when commodity does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.getPriceHistory('nonexistent-id', historyQuery as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call db.execute for history query and return time series data', async () => {
      mockDb.limit.mockResolvedValueOnce([
        { id: 'commodity-uuid-001', nameAr: 'تمور', nameEn: 'Dates', unit: 'kg' },
      ]);
      mockDb.execute.mockResolvedValueOnce([
        {
          date: '2026-01-15',
          avg_price: '1500',
          min_price: 1400,
          max_price: 1600,
          sample_count: '3',
        },
      ]);

      const result = await service.getPriceHistory('commodity-uuid-001', historyQuery as never);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        date: '2026-01-15',
        avgPrice: 1500,
        minPrice: 1400,
        maxPrice: 1600,
        sampleCount: 3,
      });
    });

    it('should map period to correct date truncation unit', async () => {
      mockDb.limit.mockResolvedValueOnce([
        { id: 'commodity-uuid-001', nameAr: 'تمور', nameEn: null, unit: 'kg' },
      ]);
      mockDb.execute.mockResolvedValueOnce([]);

      await service.getPriceHistory('commodity-uuid-001', { period: '1y' } as never);

      // 1y period should use 'month' truncation — visible in the SQL template call
      expect(mockDb.execute).toHaveBeenCalled();
      const executeSqlArg = mockDb.execute.mock.calls[0]![0] as { queryChunks?: unknown[] };
      // The SQL template contains the trunc unit as a string literal
      const sqlString = JSON.stringify(executeSqlArg);
      expect(sqlString).toContain('month');
    });
  });
});
