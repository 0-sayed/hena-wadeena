// services/market/src/admin/admin.service.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    service = new AdminService(mockDb as never);
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      // Mock listing stats
      mockDb.orderBy.mockResolvedValueOnce([
        { status: 'draft', count: 5 },
        { status: 'active', count: 20 },
        { status: 'suspended', count: 2 },
      ]);
      // Mock verified count
      mockDb.orderBy.mockResolvedValueOnce([{ count: 18 }]);
      // Mock featured count
      mockDb.orderBy.mockResolvedValueOnce([{ count: 3 }]);
      // Mock review stats
      mockDb.orderBy.mockResolvedValueOnce([{ total: 50, averageRating: 4.2 }]);
      // Mock opportunity count
      mockDb.orderBy.mockResolvedValueOnce([{ count: 10 }]);
      // Mock application stats
      mockDb.orderBy.mockResolvedValueOnce([
        { status: 'pending', count: 5 },
        { status: 'reviewed', count: 3 },
        { status: 'accepted', count: 8 },
        { status: 'rejected', count: 2 },
      ]);
      // Mock business stats
      mockDb.orderBy.mockResolvedValueOnce([
        { isVerified: true, count: 15 },
        { isVerified: false, count: 5 },
      ]);
      // Mock commodity stats
      mockDb.orderBy.mockResolvedValueOnce([{ commodities: 8, prices: 24 }]);

      const result = await service.getStats();

      expect(result.listings.total).toBe(27);
      expect(result.listings.draft).toBe(5);
      expect(result.listings.active).toBe(20);
      expect(result.reviews.total).toBe(50);
      expect(result.investments.opportunities).toBe(10);
      expect(result.businesses.total).toBe(20);
    });
  });

  describe('getModerationQueue', () => {
    it('should return pending items from all domains', async () => {
      // Mock draft listings
      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'listing-1',
          titleAr: 'عقار',
          titleEn: 'Property',
          ownerId: 'user-1',
          createdAt: new Date(),
        },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([{ count: 1 }]);
      // Mock unverified businesses
      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'biz-1',
          nameAr: 'شركة',
          nameEn: 'Company',
          ownerId: 'user-2',
          createdAt: new Date(),
        },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([{ count: 1 }]);
      // Mock review-status opportunities
      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'opp-1',
          titleAr: 'فرصة',
          titleEn: 'Opportunity',
          sector: 'agriculture',
          ownerId: 'user-3',
          createdAt: new Date(),
        },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getModerationQueue();

      expect(result.listings.count).toBe(1);
      expect(result.listings.items).toHaveLength(1);
      expect(result.businesses.count).toBe(1);
      expect(result.investments.count).toBe(1);
      expect(result.totalPending).toBe(3);
    });

    it('should return empty arrays when no pending items', async () => {
      mockDb.orderBy.mockResolvedValue([]);

      const result = await service.getModerationQueue();

      expect(result.listings.items).toHaveLength(0);
      expect(result.businesses.items).toHaveLength(0);
      expect(result.investments.items).toHaveLength(0);
      expect(result.totalPending).toBe(0);
    });
  });
});
