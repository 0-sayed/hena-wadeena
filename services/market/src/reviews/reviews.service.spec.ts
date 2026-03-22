import { EVENTS } from '@hena-wadeena/types';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedisStreams } from '../shared/test-helpers';

import { ReviewsService } from './reviews.service';

const mockRedisStreams = createMockRedisStreams();

const REVIEWER_ID = 'reviewer-uuid-001';
const OTHER_ID = 'other-uuid-002';
const ADMIN_ID = 'admin-uuid-003';
const LISTING_ID = 'listing-uuid-001';
const REVIEW_ID = 'review-uuid-001';
const OWNER_ID = 'owner-uuid-001';

const mockListing = {
  id: LISTING_ID,
  ownerId: OWNER_ID,
};

const mockReview = {
  id: REVIEW_ID,
  listingId: LISTING_ID,
  reviewerId: REVIEWER_ID,
  rating: 4,
  title: 'Great place',
  comment: 'Highly recommended',
  helpfulCount: 0,
  isVerifiedVisit: false,
  isActive: true,
  images: null,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    mockRedisStreams.publish.mockResolvedValue('mock-stream-id');

    service = new ReviewsService(mockDb as never, mockRedisStreams as never);
  });

  describe('create', () => {
    it('should create a review, recalculate rating, and publish event', async () => {
      // listing lookup
      mockDb.limit.mockResolvedValueOnce([mockListing]);
      // insert + returning (inside transaction)
      mockDb.returning.mockResolvedValueOnce([mockReview]);
      // recalculateRating (execute inside transaction)
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.create(
        { listingId: LISTING_ID, rating: 4, comment: 'Highly recommended', title: 'Great place' },
        REVIEWER_ID,
      );

      expect(result).toEqual(mockReview);
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        EVENTS.REVIEW_SUBMITTED,
        expect.objectContaining({ reviewId: REVIEW_ID, targetType: 'listing' }),
      );
    });

    it('should throw NotFoundException when listing not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.create({ listingId: LISTING_ID, rating: 4, comment: 'Test' }, REVIEWER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when reviewing own listing', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: LISTING_ID, ownerId: REVIEWER_ID }]);

      await expect(
        service.create({ listingId: LISTING_ID, rating: 4, comment: 'Test' }, REVIEWER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException on duplicate review', async () => {
      mockDb.limit.mockResolvedValueOnce([mockListing]);
      const pgError = new Error('unique violation');
      Object.assign(pgError, { code: '23505' });
      mockDb.transaction.mockRejectedValueOnce(pgError);

      await expect(
        service.create({ listingId: LISTING_ID, rating: 4, comment: 'Test' }, REVIEWER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when listing exists but is not active', async () => {
      // listing lookup returns empty because WHERE filters on status='active'
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.create({ listingId: LISTING_ID, rating: 4, comment: 'Test' }, REVIEWER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update review fields', async () => {
      // findActiveReview
      mockDb.limit.mockResolvedValueOnce([mockReview]);
      // transaction: update + returning
      const updatedReview = { ...mockReview, rating: 5, updatedAt: new Date() };
      mockDb.returning.mockResolvedValueOnce([updatedReview]);
      // recalculateRating
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.update(REVIEW_ID, { rating: 5 }, REVIEWER_ID);
      expect(result.rating).toBe(5);
    });

    it('should throw ForbiddenException when caller is not author', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);

      await expect(service.update(REVIEW_ID, { rating: 5 }, OTHER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when review not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.update(REVIEW_ID, { rating: 5 }, REVIEWER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete when caller is author', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);
      // transaction: update.execute + recalculate.execute
      mockDb.execute.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValueOnce([]);

      await expect(service.remove(REVIEW_ID, REVIEWER_ID, 'tourist')).resolves.not.toThrow();
    });

    it('should soft-delete when caller is admin', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);
      mockDb.execute.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValueOnce([]);

      await expect(service.remove(REVIEW_ID, ADMIN_ID, 'admin')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when caller is neither author nor admin', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);

      await expect(service.remove(REVIEW_ID, OTHER_ID, 'tourist')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markHelpful', () => {
    it('should increment helpfulCount', async () => {
      mockDb.returning.mockResolvedValueOnce([{ ...mockReview, helpfulCount: 1 }]);

      const result = await service.markHelpful(REVIEW_ID);
      expect(result.helpfulCount).toBe(1);
    });

    it('should throw NotFoundException when review not found or inactive', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.markHelpful(REVIEW_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByListing', () => {
    it('should return paginated reviews', async () => {
      // data query (thenable chain resolves via .then mock)
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([mockReview]);
      });
      // count query
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([{ count: 1 }]);
      });

      const result = await service.findByListing(LISTING_ID, {
        offset: 0,
        limit: 20,
        sort: 'created_at|desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should exclude inactive reviews', async () => {
      // data query returns empty (inactive reviews filtered by WHERE is_active=true)
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([]);
      });
      // count query
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([{ count: 0 }]);
      });

      const result = await service.findByListing(LISTING_ID, {
        offset: 0,
        limit: 20,
        sort: 'created_at|desc',
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findMine', () => {
    it("should return only the caller's reviews", async () => {
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([mockReview]);
      });
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([{ count: 1 }]);
      });

      const result = await service.findMine(REVIEWER_ID, {
        offset: 0,
        limit: 20,
        sort: 'created_at|desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
