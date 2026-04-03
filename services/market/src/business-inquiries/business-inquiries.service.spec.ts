import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { createMockDb } from '../shared/test-helpers';

import { BusinessInquiriesService } from './business-inquiries.service';

const mockBusiness = {
  id: 'business-uuid-001',
  ownerId: 'owner-uuid-001',
  status: 'active',
  verificationStatus: 'verified',
  nameAr: 'شركة الوادي الناشئة',
};

describe('BusinessInquiriesService', () => {
  let service: BusinessInquiriesService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new BusinessInquiriesService(mockDb as never);
  });

  it('stores an inquiry for an active verified business', async () => {
    const createdInquiry = {
      id: 'inquiry-uuid-001',
      businessId: mockBusiness.id,
      senderId: 'sender-uuid-001',
      receiverId: mockBusiness.ownerId,
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'I want to discuss an investment partnership.',
      replyMessage: null,
      status: 'pending',
      readAt: null,
      respondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.limit.mockResolvedValueOnce([mockBusiness]);
    mockDb.returning.mockResolvedValueOnce([createdInquiry]);

    const result = await service.submit(mockBusiness.id, 'sender-uuid-001', {
      contactName: 'Test User',
      contactEmail: 'user@example.com',
      contactPhone: '01000000000',
      message: 'I want to discuss an investment partnership.',
    });

    expect(result).toEqual(createdInquiry);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('rejects inquiries for the business owner', async () => {
    mockDb.limit.mockResolvedValueOnce([mockBusiness]);

    await expect(
      service.submit(mockBusiness.id, mockBusiness.ownerId, {
        contactName: 'Owner',
        message: 'test',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns received inquiries with business context', async () => {
    const inquiryRecord = {
      id: 'inquiry-uuid-001',
      businessId: mockBusiness.id,
      businessName: mockBusiness.nameAr,
      businessOwnerId: mockBusiness.ownerId,
      senderId: 'sender-uuid-001',
      receiverId: mockBusiness.ownerId,
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

    const result = await service.findReceived(mockBusiness.ownerId, { offset: 0, limit: 20 });

    expect(result.data).toEqual([inquiryRecord]);
    expect(result.total).toBe(1);
  });

  it('returns the full inquiry record when marking an inquiry as read', async () => {
    const pendingInquiry = {
      id: 'inquiry-uuid-001',
      businessId: mockBusiness.id,
      businessName: mockBusiness.nameAr,
      businessOwnerId: mockBusiness.ownerId,
      senderId: 'sender-uuid-001',
      receiverId: mockBusiness.ownerId,
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

    const result = await service.markRead(pendingInquiry.id, mockBusiness.ownerId);

    expect(result).toEqual(readInquiry);
    expect(result.businessName).toBe(mockBusiness.nameAr);
    expect(result.businessOwnerId).toBe(mockBusiness.ownerId);
  });

  it('throws when trying to mark a missing inquiry as read', async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    await expect(service.markRead('missing-inquiry', mockBusiness.ownerId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
