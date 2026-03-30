import { EVENTS } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedis, createMockRedisStreams } from '../shared/test-helpers';

import { InvestmentOpportunitiesService } from './investment-opportunities.service';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const mockOpportunity = {
  id: 'opp-uuid-001',
  ownerId: 'owner-uuid-001',
  titleAr: 'مشروع زراعي',
  titleEn: 'Agricultural Project',
  description: 'A farming project',
  sector: 'agriculture' as const,
  area: 'Al Kharga',
  landAreaSqm: null,
  minInvestment: 100000,
  maxInvestment: 500000,
  currency: 'EGP',
  expectedReturnPct: null,
  paybackPeriodYears: null,
  incentives: null,
  infrastructure: null,
  contact: null,
  documents: null,
  images: null,
  status: 'active' as const,
  source: null,
  expiresAt: null,
  isVerified: false,
  isFeatured: false,
  interestCount: 0,
  approvedBy: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createDto = {
  titleAr: 'مشروع زراعي',
  titleEn: 'Agricultural Project',
  sector: 'agriculture',
  minInvestment: 100000,
  maxInvestment: 500000,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InvestmentOpportunitiesService', () => {
  let service: InvestmentOpportunitiesService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let mockRedisStreams: ReturnType<typeof createMockRedisStreams>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedis = createMockRedis();
    mockRedisStreams = createMockRedisStreams();
    vi.clearAllMocks();
    service = new InvestmentOpportunitiesService(
      mockDb as never,
      mockRedis as never,
      mockRedisStreams as never,
    );
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('should insert with status=draft and ownerId from caller', async () => {
      mockDb.returning.mockResolvedValueOnce([mockOpportunity]);

      const result = await service.create(createDto as never, 'owner-uuid-001');

      expect(result).toEqual(mockOpportunity);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'owner-uuid-001',
          status: 'draft',
        }),
      );
    });

    it('should NOT emit an event on create (draft is not published)', async () => {
      mockDb.returning.mockResolvedValueOnce([mockOpportunity]);

      await service.create(createDto as never, 'owner-uuid-001');

      expect(mockRedisStreams.publish).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // assertOwnership
  // -------------------------------------------------------------------------

  describe('assertOwnership', () => {
    it('should return the opportunity when caller is the owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]);

      const result = await service.assertOwnership(mockOpportunity.id, mockOpportunity.ownerId);

      expect(result).toEqual(mockOpportunity);
    });

    it('should throw NotFoundException when opportunity does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.assertOwnership('nonexistent-id', 'any-caller')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when caller is not the owner', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]);

      await expect(
        service.assertOwnership(mockOpportunity.id, 'different-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -------------------------------------------------------------------------
  // findById — visibility logic
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('should return an active opportunity to any caller (public access) with sensitive fields stripped', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]);

      const result = await service.findById(mockOpportunity.id);

      expect(result).toBeDefined();
      // Public access: contact, documents, description should be stripped
      expect(result).not.toHaveProperty('contact');
      expect(result).not.toHaveProperty('documents');
      expect(result).not.toHaveProperty('description');
    });

    it('should return full opportunity (including sensitive fields) to privileged caller', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]);

      const result = await service.findById(mockOpportunity.id, 'some-investor', 'investor');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('contact');
      expect(result).toHaveProperty('documents');
      expect(result).toHaveProperty('description');
    });

    it('should return null when opportunity does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return a draft opportunity to its owner', async () => {
      const draftOpp = { ...mockOpportunity, status: 'draft' as const };
      mockDb.limit.mockResolvedValueOnce([draftOpp]);

      const result = await service.findById(draftOpp.id, draftOpp.ownerId);

      expect(result).toBeDefined();
    });

    it('should return null for a draft opportunity when caller is not the owner', async () => {
      const draftOpp = { ...mockOpportunity, status: 'draft' as const };
      mockDb.limit.mockResolvedValueOnce([draftOpp]);

      const result = await service.findById(draftOpp.id, 'different-user-id');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findAll — pagination
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    beforeEach(() => {
      vi.spyOn(service as any, 'countOpportunities').mockResolvedValue(50);
    });

    it('should return paginated results with correct page calculation', async () => {
      mockDb.offset.mockResolvedValueOnce([mockOpportunity]);

      const result = await service.findAll({ offset: 0, limit: 20 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true);
      // Public list endpoints strip sensitive fields (contact, documents, description)
      const expected = { ...mockOpportunity };
      delete (expected as Record<string, unknown>).contact;
      delete (expected as Record<string, unknown>).documents;
      delete (expected as Record<string, unknown>).description;
      expect(result.data).toEqual([expected]);
    });
  });

  // -------------------------------------------------------------------------
  // update — validation
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('should throw BadRequestException when partial minInvestment exceeds existing maxInvestment', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]); // maxInvestment: 500000

      await expect(
        service.update(mockOpportunity.id, { minInvestment: 600000 } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when partial maxInvestment is below existing minInvestment', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]); // minInvestment: 100000

      await expect(
        service.update(mockOpportunity.id, { maxInvestment: 50000 } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid partial update of minInvestment', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]); // maxInvestment: 500000
      mockDb.returning.mockResolvedValueOnce([{ ...mockOpportunity, minInvestment: 200000 }]);

      const result = await service.update(mockOpportunity.id, { minInvestment: 200000 } as never);

      expect(result.minInvestment).toBe(200000);
    });
  });

  // -------------------------------------------------------------------------
  // close — status transition
  // -------------------------------------------------------------------------

  describe('close', () => {
    it('should transition status to closed', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]);
      mockDb.returning.mockResolvedValueOnce([{ ...mockOpportunity, status: 'closed' }]);

      const result = await service.close(mockOpportunity.id);

      expect(result.status).toBe('closed');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when opportunity does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.close('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already closed', async () => {
      const closedOpp = { ...mockOpportunity, status: 'closed' as const };
      mockDb.limit.mockResolvedValueOnce([closedOpp]);

      await expect(service.close(closedOpp.id)).rejects.toThrow(ConflictException);
    });
  });

  // -------------------------------------------------------------------------
  // approve — admin action
  // -------------------------------------------------------------------------

  describe('approve', () => {
    it('should transition from review to active and emit event', async () => {
      const reviewOpp = { ...mockOpportunity, status: 'review' as const };
      mockDb.limit.mockResolvedValueOnce([reviewOpp]);
      mockDb.returning.mockResolvedValueOnce([{ ...reviewOpp, status: 'active' }]);

      const result = await service.approve(reviewOpp.id, 'admin-uuid-001');

      expect(result.status).toBe('active');
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        EVENTS.OPPORTUNITY_PUBLISHED,
        expect.objectContaining({
          opportunityId: reviewOpp.id,
          ownerId: reviewOpp.ownerId,
          titleAr: reviewOpp.titleAr,
          titleEn: reviewOpp.titleEn,
          sector: reviewOpp.sector,
        }),
      );
    });

    it('should throw ConflictException when status is not review', async () => {
      mockDb.limit.mockResolvedValueOnce([mockOpportunity]); // status=active

      await expect(service.approve(mockOpportunity.id, 'admin-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
