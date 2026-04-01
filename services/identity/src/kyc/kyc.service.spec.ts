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

  describe('findAll', () => {
    it('should return all KYC submissions when no status filter is provided', async () => {
      const data = [{ ...mockKyc, fullName: 'User Name', reviewedByName: null }];

      mockDb.innerJoin.mockReturnValueOnce(mockDb as any);
      mockDb.offset.mockResolvedValueOnce(data);
      mockDb.innerJoin.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(data);
      expect(result.total).toBe(1);
      expect(mockDb.where).not.toHaveBeenCalled();
    });

    it('should apply the requested status filter', async () => {
      const approvedRecord = {
        ...mockKyc,
        status: 'approved' as const,
        fullName: 'User Name',
        reviewedByName: 'Admin Name',
      };

      mockDb.where.mockReturnValueOnce(mockDb as any);
      mockDb.offset.mockResolvedValueOnce([approvedRecord]);
      mockDb.where.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.findAll({ page: 1, limit: 20, status: 'approved' });

      expect(result.data).toEqual([approvedRecord]);
      expect(result.total).toBe(1);
      expect(mockDb.where).toHaveBeenCalledTimes(2);
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
