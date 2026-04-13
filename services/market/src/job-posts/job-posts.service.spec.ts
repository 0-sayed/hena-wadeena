import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedisStreams } from '../shared/test-helpers';

import { JobPostsService } from './job-posts.service';

const mockRedisStreams = createMockRedisStreams();

const mockJob = {
  id: 'job-uuid-001',
  posterId: 'poster-uuid-001',
  title: 'Harvest helper needed',
  descriptionAr: 'نحتاج عامل حصاد',
  descriptionEn: null,
  category: 'agriculture' as const,
  location: null,
  area: 'kharga',
  compensation: 5000,
  compensationType: 'daily' as const,
  slots: 2,
  status: 'open' as const,
  startsAt: null,
  endsAt: null,
  createdAt: new Date(),
  deletedAt: null,
};

const createDto = {
  title: 'Harvest helper needed',
  descriptionAr: 'نحتاج عامل حصاد',
  category: 'agriculture',
  compensation: 5000,
  compensationType: 'daily',
  slots: 2,
  area: 'kharga',
};

describe('JobPostsService', () => {
  let service: JobPostsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    service = new JobPostsService(mockDb as never, mockRedisStreams as never);
  });

  describe('create', () => {
    it('should create a job post and emit JOB_POSTED event', async () => {
      mockDb.returning.mockResolvedValueOnce([mockJob]);

      const result = await service.create('poster-uuid-001', createDto as never);

      expect(result).toEqual(mockJob);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ posterId: 'poster-uuid-001' }),
      );
      expect(mockRedisStreams.publish).toHaveBeenCalledWith(
        'job.posted',
        expect.objectContaining({ jobId: mockJob.id }),
      );
    });
  });

  describe('findById', () => {
    it('should return the job when found', async () => {
      mockDb.limit.mockResolvedValueOnce([mockJob]);

      const result = await service.findById('job-uuid-001');

      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException when job does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an open job when caller is the poster', async () => {
      mockDb.limit.mockResolvedValueOnce([mockJob]);
      const updated = { ...mockJob, title: 'Updated title' };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.update('job-uuid-001', 'poster-uuid-001', {
        title: 'Updated title',
      } as never);

      expect(result.title).toBe('Updated title');
    });

    it('should throw ForbiddenException when caller is not the poster', async () => {
      mockDb.limit.mockResolvedValueOnce([mockJob]);

      await expect(service.update('job-uuid-001', 'other-user', {} as never)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when job is not open', async () => {
      const closedJob = { ...mockJob, status: 'completed' as const };
      mockDb.limit.mockResolvedValueOnce([closedJob]);

      await expect(service.update('job-uuid-001', 'poster-uuid-001', {} as never)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete the job when caller is the poster', async () => {
      mockDb.limit.mockResolvedValueOnce([mockJob]);

      await service.remove('job-uuid-001', 'poster-uuid-001');

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should throw ForbiddenException when caller is not the poster', async () => {
      mockDb.limit.mockResolvedValueOnce([mockJob]);

      await expect(service.remove('job-uuid-001', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
