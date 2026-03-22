import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../shared/test-helpers';

import { InvestmentApplicationsService } from './investment-applications.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockS3 = {
  getPresignedUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: 'https://s3.example.com/upload' }),
};

const mockOpportunitiesService = {
  findById: vi.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockApplication = {
  id: 'app-uuid-001',
  opportunityId: 'opp-uuid-001',
  investorId: 'investor-uuid-001',
  amountProposed: 200000,
  message: 'Interested in this project',
  contactEmail: 'investor@example.com',
  contactPhone: null,
  documents: null,
  status: 'pending' as const,
  createdAt: new Date(),
};

const mockOpportunity = {
  id: 'opp-uuid-001',
  ownerId: 'owner-uuid-001',
  status: 'active' as const,
};

const createDto = {
  contactEmail: 'investor@example.com',
  message: 'Interested in this project',
  amountProposed: 200000,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InvestmentApplicationsService', () => {
  let service: InvestmentApplicationsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    mockOpportunitiesService.findById.mockResolvedValue(mockOpportunity);
    service = new InvestmentApplicationsService(
      mockDb as never,
      mockS3 as never,
      mockOpportunitiesService as never,
    );
  });

  // -------------------------------------------------------------------------
  // submitInterest
  // -------------------------------------------------------------------------

  describe('submitInterest', () => {
    it('should create an application with status=pending', async () => {
      mockDb.returning.mockResolvedValueOnce([mockApplication]);

      const result = await service.submitInterest(
        'opp-uuid-001',
        'investor-uuid-001',
        createDto as never,
      );

      expect(result).toEqual(mockApplication);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          opportunityId: 'opp-uuid-001',
          investorId: 'investor-uuid-001',
          status: 'pending',
        }),
      );
    });

    it('should throw NotFoundException when opportunity does not exist', async () => {
      mockOpportunitiesService.findById.mockResolvedValue(null);

      await expect(
        service.submitInterest('nonexistent', 'investor-uuid-001', createDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when opportunity is not active', async () => {
      mockOpportunitiesService.findById.mockResolvedValue({
        ...mockOpportunity,
        status: 'draft',
      });

      await expect(
        service.submitInterest('opp-uuid-001', 'investor-uuid-001', createDto as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  // -------------------------------------------------------------------------
  // withdraw
  // -------------------------------------------------------------------------

  describe('withdraw', () => {
    it('should transition from pending to withdrawn', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApplication]);
      mockDb.returning.mockResolvedValueOnce([{ ...mockApplication, status: 'withdrawn' }]);

      const result = await service.withdraw('opp-uuid-001', 'investor-uuid-001');

      expect(result.status).toBe('withdrawn');
    });

    it('should throw NotFoundException when no application found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.withdraw('opp-uuid-001', 'different-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when application is already accepted', async () => {
      const accepted = { ...mockApplication, status: 'accepted' as const };
      mockDb.limit.mockResolvedValueOnce([accepted]);

      await expect(service.withdraw('opp-uuid-001', 'investor-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when application is already rejected', async () => {
      const rejected = { ...mockApplication, status: 'rejected' as const };
      mockDb.limit.mockResolvedValueOnce([rejected]);

      await expect(service.withdraw('opp-uuid-001', 'investor-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus — admin transitions
  // -------------------------------------------------------------------------

  describe('updateStatus', () => {
    it('should transition from pending to reviewed', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApplication]);
      mockDb.returning.mockResolvedValueOnce([{ ...mockApplication, status: 'reviewed' }]);

      const result = await service.updateStatus('app-uuid-001', { status: 'reviewed' } as never);

      expect(result.status).toBe('reviewed');
    });

    it('should transition from reviewed to accepted', async () => {
      const reviewed = { ...mockApplication, status: 'reviewed' as const };
      mockDb.limit.mockResolvedValueOnce([reviewed]);
      mockDb.returning.mockResolvedValueOnce([{ ...reviewed, status: 'accepted' }]);

      const result = await service.updateStatus('app-uuid-001', { status: 'accepted' } as never);

      expect(result.status).toBe('accepted');
    });

    it('should throw ConflictException for invalid transition (pending -> accepted)', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApplication]); // status=pending

      await expect(
        service.updateStatus('app-uuid-001', { status: 'accepted' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for terminal state (rejected -> reviewed)', async () => {
      const rejected = { ...mockApplication, status: 'rejected' as const };
      mockDb.limit.mockResolvedValueOnce([rejected]);

      await expect(
        service.updateStatus('app-uuid-001', { status: 'reviewed' } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  // -------------------------------------------------------------------------
  // generateDocUploadUrl
  // -------------------------------------------------------------------------

  describe('generateDocUploadUrl', () => {
    it('should return presigned URL when caller is opportunity owner', async () => {
      mockOpportunitiesService.findById.mockResolvedValue(mockOpportunity);

      const result = await service.generateDocUploadUrl('opp-uuid-001', 'owner-uuid-001', {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      } as never);

      expect(result.uploadUrl).toBeDefined();
      expect(result.key).toContain('investments/opp-uuid-001/docs/');
    });

    it('should return presigned URL when caller has accepted application', async () => {
      mockOpportunitiesService.findById.mockResolvedValue(mockOpportunity);
      const accepted = { ...mockApplication, status: 'accepted' as const };
      mockDb.limit.mockResolvedValueOnce([accepted]);

      const result = await service.generateDocUploadUrl('opp-uuid-001', 'investor-uuid-001', {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      } as never);

      expect(result.uploadUrl).toBeDefined();
    });

    it('should throw ForbiddenException when caller has no accepted application and is not owner', async () => {
      mockOpportunitiesService.findById.mockResolvedValue(mockOpportunity);
      mockDb.limit.mockResolvedValueOnce([]); // no application found

      await expect(
        service.generateDocUploadUrl('opp-uuid-001', 'random-user', {
          filename: 'report.pdf',
          contentType: 'application/pdf',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
