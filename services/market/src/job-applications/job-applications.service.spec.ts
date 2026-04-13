import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedisStreams } from '../shared/test-helpers';

import { JobApplicationsService } from './job-applications.service';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockRedisStreams = createMockRedisStreams();

const mockHttpService = {
  post: vi.fn().mockReturnValue(of({ data: { status: 'applied' } })),
};

const mockJobPostsService = {
  findRaw: vi.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockJob = {
  id: 'job-uuid-001',
  posterId: 'poster-uuid-001',
  title: 'Harvest helper',
  slots: 2,
  compensation: 5000,
  status: 'open' as const,
  deletedAt: null,
};

const mockApp = {
  id: 'app-uuid-001',
  jobId: 'job-uuid-001',
  applicantId: 'worker-uuid-001',
  noteAr: null,
  status: 'pending' as const,
  appliedAt: new Date(),
  resolvedAt: null,
};

const mockReview = {
  id: 'review-uuid-001',
  jobId: 'job-uuid-001',
  applicationId: 'app-uuid-001',
  reviewerId: 'poster-uuid-001',
  revieweeId: 'worker-uuid-001',
  direction: 'poster_rates_worker' as const,
  rating: 4,
  comment: null,
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobApplicationsService', () => {
  let service: JobApplicationsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    mockJobPostsService.findRaw.mockResolvedValue(mockJob);
    service = new JobApplicationsService(
      mockDb as never,
      mockRedisStreams as never,
      mockHttpService as never,
      mockJobPostsService as never,
    );
  });

  // -------------------------------------------------------------------------
  // apply
  // -------------------------------------------------------------------------

  describe('apply', () => {
    it('should create a pending application and emit JOB_APPLICATION_RECEIVED', async () => {
      mockJobPostsService.findRaw.mockResolvedValue(mockJob);
      mockDb.returning.mockResolvedValueOnce([mockApp]);

      const result = await service.apply('job-uuid-001', 'worker-uuid-001', {} as never);

      expect(result).toEqual(mockApp);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', applicantId: 'worker-uuid-001' }),
      );
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        'job.application.received',
        expect.objectContaining({ jobId: 'job-uuid-001' }),
      );
    });

    it('should throw NotFoundException when job does not exist', async () => {
      mockJobPostsService.findRaw.mockResolvedValue(null);

      await expect(service.apply('nonexistent', 'worker-uuid-001', {} as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when job is not open', async () => {
      mockJobPostsService.findRaw.mockResolvedValue({ ...mockJob, status: 'completed' });

      await expect(service.apply('job-uuid-001', 'worker-uuid-001', {} as never)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateApplicationStatus — state machine
  // -------------------------------------------------------------------------

  describe('updateApplicationStatus — valid transitions', () => {
    it('pending → accepted', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]); // find app
      mockDb.execute.mockResolvedValueOnce([{ count: 0 }]); // 0 slots filled
      mockDb.returning.mockResolvedValueOnce([{ ...mockApp, status: 'accepted' }]);

      const result = await service.updateApplicationStatus(
        'job-uuid-001',
        'app-uuid-001',
        'poster-uuid-001',
        { status: 'accepted' } as never,
      );

      expect(result.status).toBe('accepted');
    });

    it('pending → rejected', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]);
      mockDb.returning.mockResolvedValueOnce([{ ...mockApp, status: 'rejected' }]);

      const result = await service.updateApplicationStatus(
        'job-uuid-001',
        'app-uuid-001',
        'poster-uuid-001',
        { status: 'rejected' } as never,
      );

      expect(result.status).toBe('rejected');
    });

    it('accepted → in_progress', async () => {
      const accepted = { ...mockApp, status: 'accepted' as const };
      mockDb.limit.mockResolvedValueOnce([accepted]);
      mockDb.returning.mockResolvedValueOnce([{ ...accepted, status: 'in_progress' }]);

      const result = await service.updateApplicationStatus(
        'job-uuid-001',
        'app-uuid-001',
        'poster-uuid-001',
        { status: 'in_progress' } as never,
      );

      expect(result.status).toBe('in_progress');
    });

    it('in_progress → completed (with wallet transfer)', async () => {
      const inProgress = { ...mockApp, status: 'in_progress' as const };
      mockDb.limit.mockResolvedValueOnce([inProgress]);
      mockDb.returning.mockResolvedValueOnce([{ ...inProgress, status: 'completed' }]);
      mockJobPostsService.findRaw.mockResolvedValue({ ...mockJob, compensation: 5000 });

      const result = await service.updateApplicationStatus(
        'job-uuid-001',
        'app-uuid-001',
        'poster-uuid-001',
        { status: 'completed' } as never,
      );

      expect(result.status).toBe('completed');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/internal/wallet/transfer'),
        expect.objectContaining({
          fromUserId: 'poster-uuid-001',
          toUserId: 'worker-uuid-001',
          amountPiasters: 5000,
          refType: 'job',
          idempotencyKey: 'job:job-uuid-001:app:app-uuid-001',
        }),
        expect.any(Object),
      );
    });
  });

  describe('updateApplicationStatus — invalid transitions', () => {
    it('pending → in_progress is invalid', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]);

      await expect(
        service.updateApplicationStatus('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
          status: 'in_progress',
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('completed → accepted is invalid (terminal state)', async () => {
      const completed = { ...mockApp, status: 'completed' as const };
      mockDb.limit.mockResolvedValueOnce([completed]);

      await expect(
        service.updateApplicationStatus('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
          status: 'accepted',
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when caller is not the poster', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]);
      mockJobPostsService.findRaw.mockResolvedValue({ ...mockJob, posterId: 'poster-uuid-001' });

      await expect(
        service.updateApplicationStatus('job-uuid-001', 'app-uuid-001', 'random-user', {
          status: 'rejected',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateApplicationStatus — slots enforcement', () => {
    it('should throw ConflictException when all slots are filled', async () => {
      const job1Slot = { ...mockJob, slots: 1 };
      mockJobPostsService.findRaw.mockResolvedValue(job1Slot);
      mockDb.limit.mockResolvedValueOnce([mockApp]); // pending app
      mockDb.execute.mockResolvedValueOnce([{ count: 1 }]); // 1 accepted already

      await expect(
        service.updateApplicationStatus('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
          status: 'accepted',
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow accepting when a slot is available', async () => {
      const job2Slots = { ...mockJob, slots: 2 };
      mockJobPostsService.findRaw.mockResolvedValue(job2Slots);
      mockDb.limit.mockResolvedValueOnce([mockApp]); // pending app
      mockDb.execute.mockResolvedValueOnce([{ count: 1 }]); // 1 of 2 slots filled
      mockDb.returning.mockResolvedValueOnce([{ ...mockApp, status: 'accepted' }]);

      const result = await service.updateApplicationStatus(
        'job-uuid-001',
        'app-uuid-001',
        'poster-uuid-001',
        { status: 'accepted' } as never,
      );

      expect(result.status).toBe('accepted');
    });
  });

  describe('updateApplicationStatus — concurrent state change', () => {
    it('should throw ConflictException when WHERE clause matches 0 rows', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]); // app found in initial read
      mockDb.returning.mockResolvedValueOnce([]); // 0 rows updated (concurrent change)

      await expect(
        service.updateApplicationStatus('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
          status: 'rejected',
        } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateApplicationStatus — wallet transfer', () => {
    it('should skip wallet transfer when compensation is 0', async () => {
      const freeJob = { ...mockJob, compensation: 0 };
      mockJobPostsService.findRaw.mockResolvedValue(freeJob);
      const inProgress = { ...mockApp, status: 'in_progress' as const };
      mockDb.limit.mockResolvedValueOnce([inProgress]);
      mockDb.returning.mockResolvedValueOnce([{ ...inProgress, status: 'completed' }]);

      await service.updateApplicationStatus('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
        status: 'completed',
      } as never);

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // withdrawApplication
  // -------------------------------------------------------------------------

  describe('withdrawApplication', () => {
    it('should transition from pending to withdrawn', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]);
      mockDb.returning.mockResolvedValueOnce([{ ...mockApp, status: 'withdrawn' }]);

      const result = await service.withdrawApplication(
        'job-uuid-001',
        'app-uuid-001',
        'worker-uuid-001',
      );

      expect(result.status).toBe('withdrawn');
    });

    it('should throw ForbiddenException when caller is not the applicant', async () => {
      mockDb.limit.mockResolvedValueOnce([mockApp]);

      await expect(
        service.withdrawApplication('job-uuid-001', 'app-uuid-001', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when application cannot be withdrawn (accepted)', async () => {
      const accepted = { ...mockApp, status: 'accepted' as const };
      mockDb.limit.mockResolvedValueOnce([accepted]);

      await expect(
        service.withdrawApplication('job-uuid-001', 'app-uuid-001', 'worker-uuid-001'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // -------------------------------------------------------------------------
  // submitReview
  // -------------------------------------------------------------------------

  describe('submitReview — guard: application must be completed', () => {
    it('should throw ConflictException when application is not completed', async () => {
      const accepted = { ...mockApp, status: 'accepted' as const };
      mockDb.limit.mockResolvedValueOnce([accepted]);

      await expect(
        service.submitReview('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
          direction: 'poster_rates_worker',
          rating: 5,
        } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('submitReview — uniqueness', () => {
    it('should throw ConflictException on duplicate direction', async () => {
      const completedApp = { ...mockApp, status: 'completed' as const };
      mockDb.limit
        .mockResolvedValueOnce([completedApp]) // find app
        .mockResolvedValueOnce([mockReview]); // existing review found

      await expect(
        service.submitReview('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
          direction: 'poster_rates_worker',
          rating: 4,
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('should create review when no duplicate exists', async () => {
      const completedApp = { ...mockApp, status: 'completed' as const };
      mockDb.limit
        .mockResolvedValueOnce([completedApp]) // find app
        .mockResolvedValueOnce([]); // no existing review
      mockDb.returning.mockResolvedValueOnce([mockReview]);

      const result = await service.submitReview('job-uuid-001', 'app-uuid-001', 'poster-uuid-001', {
        direction: 'poster_rates_worker',
        rating: 4,
      } as never);

      expect(result).toEqual(mockReview);
    });
  });
});
