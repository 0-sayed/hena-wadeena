import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createMockDb } from '../test-utils/create-mock-db';

import { KycService } from './kyc.service';

const mockKyc = {
  id: 'kyc-uuid',
  userId: 'user-uuid',
  docType: 'national_id' as const,
  docUrl: 'https://s3.example.com/doc.pdf',
  status: 'pending' as const,
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('KycService', () => {
  let service: KycService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockNotifications: { create: ReturnType<typeof vi.fn> };
  let mockRedisStreams: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = createMockDb();
    mockNotifications = { create: vi.fn().mockResolvedValue({}) };
    mockRedisStreams = { publish: vi.fn().mockResolvedValue('stream-id') };
    service = new KycService(mockDb as any, mockNotifications as any, mockRedisStreams as any);
  });

  describe('submit', () => {
    it('should create a pending KYC submission', async () => {
      mockDb.returning.mockResolvedValueOnce([mockKyc]);
      const result = await service.submit('user-uuid', {
        docType: 'national_id',
        docUrl: 'https://s3.example.com/doc.pdf',
      });
      expect(result).toEqual(mockKyc);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should return KYC submissions for user', async () => {
      mockDb.orderBy.mockResolvedValueOnce([mockKyc]);
      const result = await service.findByUser('user-uuid');
      expect(result).toEqual([mockKyc]);
    });
  });

  describe('review — approve', () => {
    it('should approve KYC and create notification', async () => {
      // Inside transaction: update kyc → update users → insert audit
      mockDb.returning.mockResolvedValueOnce([{ ...mockKyc, status: 'approved' }]);

      await service.review('kyc-uuid', 'admin-uuid', {
        status: 'approved',
      });

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'kyc_approved', userId: 'user-uuid' }),
      );
      expect(mockRedisStreams.publish).toHaveBeenCalled();
    });
  });

  describe('review — reject', () => {
    it('should reject KYC with reason and create notification', async () => {
      // Inside transaction: update kyc → insert audit
      mockDb.returning.mockResolvedValueOnce([{ ...mockKyc, status: 'rejected' }]);

      await service.review('kyc-uuid', 'admin-uuid', {
        status: 'rejected',
        rejectionReason: 'Document unclear',
      });

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'kyc_rejected', userId: 'user-uuid' }),
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('should throw NotFoundException when not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(service.findByIdOrThrow('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
