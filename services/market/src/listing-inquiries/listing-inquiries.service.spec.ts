import { EVENTS } from '@hena-wadeena/types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { createMockDb, createMockRedisStreams } from '../shared/test-helpers';

import { ListingInquiriesService } from './listing-inquiries.service';

const mockListing = {
  id: 'listing-uuid-001',
  ownerId: 'owner-uuid-001',
  status: 'active',
  titleAr: 'Fresh Dates',
};

describe('ListingInquiriesService', () => {
  let service: ListingInquiriesService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedisStreams: ReturnType<typeof createMockRedisStreams>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedisStreams = createMockRedisStreams();
    service = new ListingInquiriesService(mockDb as never, mockRedisStreams as never);
  });

  it('stores an inquiry for an active listing', async () => {
    const createdInquiry = {
      id: 'inquiry-uuid-001',
      listingId: mockListing.id,
      senderId: 'sender-uuid-001',
      receiverId: mockListing.ownerId,
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'I want to know if this listing is still available.',
      replyMessage: null,
      status: 'pending',
      readAt: null,
      respondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.limit.mockResolvedValueOnce([mockListing]);
    mockDb.returning.mockResolvedValueOnce([createdInquiry]);

    const result = await service.submit(mockListing.id, 'sender-uuid-001', {
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'I want to know if this listing is still available.',
    });

    expect(result).toEqual(createdInquiry);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockRedisStreams.publish).toHaveBeenCalledWith(EVENTS.LISTING_INQUIRY_RECEIVED, {
      inquiryId: createdInquiry.id,
      listingId: mockListing.id,
      senderId: 'sender-uuid-001',
      receiverId: mockListing.ownerId,
      listingTitle: mockListing.titleAr,
      senderName: 'Test User',
    });
  });

  it('rejects inquiries for the owner of the listing', async () => {
    mockDb.limit.mockResolvedValueOnce([mockListing]);

    await expect(
      service.submit(mockListing.id, mockListing.ownerId, {
        contactName: 'Owner',
        message: 'test',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns received inquiries with listing context', async () => {
    const inquiryRecord = {
      id: 'inquiry-uuid-001',
      listingId: mockListing.id,
      listingTitle: 'Fresh Dates',
      listingOwnerId: mockListing.ownerId,
      senderId: 'sender-uuid-001',
      receiverId: mockListing.ownerId,
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'Interested',
      replyMessage: null,
      status: 'pending',
      readAt: null,
      respondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.offset.mockResolvedValueOnce([inquiryRecord]);
    mockDb.where.mockResolvedValueOnce([{ count: 1 }]);

    const result = await service.findReceived(mockListing.ownerId, { offset: 0, limit: 20 });

    expect(result.data).toEqual([inquiryRecord]);
    expect(result.total).toBe(1);
  });

  it('stores the owner reply and publishes a notification event', async () => {
    const inquiryRecord = {
      id: 'inquiry-uuid-001',
      listingId: mockListing.id,
      listingTitle: mockListing.titleAr,
      listingOwnerId: mockListing.ownerId,
      senderId: 'sender-uuid-001',
      receiverId: mockListing.ownerId,
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'Interested',
      replyMessage: null,
      status: 'read',
      readAt: new Date('2026-04-01T10:00:00.000Z'),
      respondedAt: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-01T09:00:00.000Z'),
    };
    const repliedInquiry = {
      ...inquiryRecord,
      replyMessage: 'Still available. You can visit this evening.',
      status: 'replied',
      respondedAt: new Date('2026-04-01T11:00:00.000Z'),
      updatedAt: new Date('2026-04-01T11:00:00.000Z'),
    };

    mockDb.limit.mockResolvedValueOnce([inquiryRecord]);
    mockDb.returning.mockResolvedValueOnce([{ id: inquiryRecord.id }]);
    mockDb.limit.mockResolvedValueOnce([repliedInquiry]);

    const result = await service.reply(inquiryRecord.id, mockListing.ownerId, {
      message: repliedInquiry.replyMessage,
    });

    expect(result).toEqual(repliedInquiry);
    expect(mockRedisStreams.publish).toHaveBeenCalledWith(EVENTS.LISTING_INQUIRY_REPLIED, {
      inquiryId: inquiryRecord.id,
      listingId: mockListing.id,
      senderId: inquiryRecord.senderId,
      receiverId: mockListing.ownerId,
      listingTitle: mockListing.titleAr,
    });
  });

  it('returns the full inquiry record when marking an inquiry as read', async () => {
    const pendingInquiry = {
      id: 'inquiry-uuid-001',
      listingId: mockListing.id,
      listingTitle: mockListing.titleAr,
      listingOwnerId: mockListing.ownerId,
      senderId: 'sender-uuid-001',
      receiverId: mockListing.ownerId,
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'Interested',
      replyMessage: null,
      status: 'pending',
      readAt: null,
      respondedAt: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-01T09:00:00.000Z'),
    };
    const readInquiry = {
      ...pendingInquiry,
      status: 'read',
      readAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    };

    mockDb.limit.mockResolvedValueOnce([pendingInquiry]);
    mockDb.returning.mockResolvedValueOnce([{ id: pendingInquiry.id }]);
    mockDb.limit.mockResolvedValueOnce([readInquiry]);

    const result = await service.markRead(pendingInquiry.id, mockListing.ownerId);

    expect(result).toEqual(readInquiry);
    expect(result.listingTitle).toBe(mockListing.titleAr);
    expect(result.listingOwnerId).toBe(mockListing.ownerId);
  });

  it('throws when trying to mark a missing inquiry as read', async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    await expect(service.markRead('missing-inquiry', mockListing.ownerId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
