import { EVENTS } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedisStreams } from '../utils/test-helpers';

import { ReviewsService } from './reviews.service';

const mockRedisStreams = createMockRedisStreams();

const TOURIST_ID = 'tourist-uuid-001';
const GUIDE_ID = 'guide-uuid-001';
const OTHER_ID = 'other-uuid-002';
const ADMIN_ID = 'admin-uuid-003';
const BOOKING_ID = 'booking-uuid-001';
const REVIEW_ID = 'review-uuid-001';

const mockBooking = {
  id: BOOKING_ID,
  guideId: GUIDE_ID,
  touristId: TOURIST_ID,
  status: 'completed',
};

const mockReview = {
  id: REVIEW_ID,
  bookingId: BOOKING_ID,
  guideId: GUIDE_ID,
  reviewerId: TOURIST_ID,
  rating: 4,
  title: 'Great tour',
  comment: 'Highly recommended',
  guideReply: null,
  helpfulCount: 0,
  isActive: true,
  images: null,
  createdAt: new Date('2026-03-20'),
  updatedAt: new Date('2026-03-20'),
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
    const dto = {
      bookingId: BOOKING_ID,
      rating: 4,
      comment: 'Highly recommended',
      title: 'Great tour',
    };

    it('should create a review, recalculate rating, and publish event', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBooking]); // booking lookup
      mockDb.returning.mockResolvedValueOnce([mockReview]); // insert
      mockDb.execute.mockResolvedValueOnce([]); // recalculateRating

      const result = await service.create(dto, TOURIST_ID);

      expect(result).toEqual(mockReview);
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        EVENTS.REVIEW_SUBMITTED,
        expect.objectContaining({ reviewId: REVIEW_ID, targetType: 'guide' }),
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.create(dto, TOURIST_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when booking not completed', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockBooking, status: 'pending' }]);

      await expect(service.create(dto, TOURIST_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when caller is not the tourist', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBooking]);

      await expect(service.create(dto, OTHER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException on duplicate review', async () => {
      mockDb.limit.mockResolvedValueOnce([mockBooking]);
      const pgError = new Error('unique violation');
      Object.assign(pgError, { code: '23505' });
      mockDb.transaction.mockRejectedValueOnce(pgError);

      await expect(service.create(dto, TOURIST_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return an active review', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);
      const result = await service.findById(REVIEW_ID);
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException when review not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(service.findById(REVIEW_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update review fields', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]); // findActiveReview
      const updatedReview = { ...mockReview, rating: 5, updatedAt: new Date() };
      mockDb.returning.mockResolvedValueOnce([updatedReview]); // update
      mockDb.execute.mockResolvedValueOnce([]); // recalculateRating

      const result = await service.update(REVIEW_ID, { rating: 5 }, TOURIST_ID);
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
      await expect(service.update(REVIEW_ID, { rating: 5 }, TOURIST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete when caller is author', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);
      mockDb.returning.mockResolvedValueOnce([{ id: REVIEW_ID }]);
      mockDb.execute.mockResolvedValueOnce([]);

      await expect(service.remove(REVIEW_ID, TOURIST_ID, 'tourist')).resolves.not.toThrow();
    });

    it('should soft-delete when caller is admin', async () => {
      mockDb.limit.mockResolvedValueOnce([mockReview]);
      mockDb.returning.mockResolvedValueOnce([{ id: REVIEW_ID }]);
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

  describe('reply', () => {
    const GUIDE_USER_ID = 'guide-user-uuid-001';

    it('should set guide_reply when caller is the reviewed guide', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: GUIDE_ID }]); // resolveGuideId
      mockDb.limit.mockResolvedValueOnce([mockReview]); // findActiveReview
      const repliedReview = { ...mockReview, guideReply: 'Thank you!' };
      mockDb.returning.mockResolvedValueOnce([repliedReview]);

      const result = await service.reply(REVIEW_ID, { guideReply: 'Thank you!' }, GUIDE_USER_ID);
      expect(result.guideReply).toBe('Thank you!');
    });

    it('should throw ForbiddenException when caller is not the reviewed guide', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: 'other-guide-id' }]); // resolveGuideId → different guide
      mockDb.limit.mockResolvedValueOnce([mockReview]); // findActiveReview

      await expect(
        service.reply(REVIEW_ID, { guideReply: 'Thanks' }, 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when caller has no guide profile', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // resolveGuideId → not found

      await expect(
        service.reply(REVIEW_ID, { guideReply: 'Thanks' }, 'no-guide-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markHelpful', () => {
    it('should insert vote and increment helpfulCount', async () => {
      mockDb.values.mockReturnValueOnce(mockDb); // insert vote
      mockDb.returning.mockResolvedValueOnce([{ ...mockReview, helpfulCount: 1 }]);

      const result = await service.markHelpful(REVIEW_ID, OTHER_ID);
      expect(result.helpfulCount).toBe(1);
    });

    it('should throw ConflictException on duplicate vote', async () => {
      const pgError = new Error('unique violation');
      Object.assign(pgError, { code: '23505' });
      mockDb.transaction.mockRejectedValueOnce(pgError);

      await expect(service.markHelpful(REVIEW_ID, OTHER_ID)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when review not found', async () => {
      const pgError = new Error('fk violation');
      Object.assign(pgError, { code: '23503' });
      mockDb.transaction.mockRejectedValueOnce(pgError);

      await expect(service.markHelpful(REVIEW_ID, OTHER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByGuide', () => {
    it('should return paginated reviews', async () => {
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([mockReview]);
      });
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([{ count: 1 }]);
      });

      const result = await service.findByGuide(GUIDE_ID, {
        offset: 0,
        limit: 20,
        sort: 'created_at|desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
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

      const result = await service.findMine(TOURIST_ID, {
        offset: 0,
        limit: 20,
        sort: 'created_at|desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
