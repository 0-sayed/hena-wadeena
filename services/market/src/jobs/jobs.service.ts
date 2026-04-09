import { generateId } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { UserRole as UserRoleEnum } from '@hena-wadeena/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { paginate } from '../shared/query-helpers';

import type { ApplyJobDto } from './dto/apply-job.dto';
import type { CreateJobDto } from './dto/create-job.dto';
import type { CreateJobReviewDto } from './dto/create-job-review.dto';
import type { QueryJobsDto } from './dto/query-jobs.dto';
import type { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { seedJobs } from './jobs.seed';
import type { JobApplicationRecord, JobPostRecord, JobReviewRecord } from './jobs.types';

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class JobsService {
  private readonly jobs: JobPostRecord[] = seedJobs();
  private readonly applications: JobApplicationRecord[] = [];
  private readonly reviews: JobReviewRecord[] = [];

  async findAll(query: QueryJobsDto): Promise<PaginatedResponse<JobPostRecord>> {
    const filtered = this.jobs
      .filter((job) => (query.category ? job.category === query.category : true))
      .filter((job) => (query.area ? job.area === query.area : true))
      .filter((job) => (query.compensationType ? job.compensationType === query.compensationType : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return paginate(
      filtered.slice(query.offset, query.offset + query.limit),
      filtered.length,
      query.offset,
      query.limit,
    );
  }

  async findById(id: string): Promise<JobPostRecord> {
    return this.requireJob(id);
  }

  async create(dto: CreateJobDto, posterId: string): Promise<JobPostRecord> {
    const created: JobPostRecord = {
      id: generateId(),
      posterId,
      title: dto.title.trim(),
      descriptionAr: dto.descriptionAr.trim(),
      descriptionEn: dto.descriptionEn?.trim() || null,
      category: dto.category,
      area: dto.area,
      compensation: dto.compensation,
      compensationType: dto.compensationType,
      slots: dto.slots ?? 1,
      status: 'open',
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt ?? null,
      createdAt: nowIso(),
    };

    this.jobs.unshift(created);
    return created;
  }

  async findMyPosts(posterId: string): Promise<PaginatedResponse<JobPostRecord>> {
    const jobs = this.jobs
      .filter((job) => job.posterId === posterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return paginate(jobs, jobs.length, 0, jobs.length || 20);
  }

  async findMyApplications(applicantId: string): Promise<PaginatedResponse<JobApplicationRecord>> {
    const apps = this.applications
      .filter((app) => app.applicantId === applicantId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

    return paginate(apps, apps.length, 0, apps.length || 20);
  }

  async apply(jobId: string, applicantId: string, dto: ApplyJobDto): Promise<JobApplicationRecord> {
    const job = this.requireJob(jobId);

    if (job.posterId === applicantId) {
      throw new ForbiddenException('Cannot apply to your own job');
    }
    if (job.status !== 'open') {
      throw new BadRequestException('Job is not accepting applications');
    }

    const existing = this.applications.find(
      (app) => app.jobId === jobId && app.applicantId === applicantId && app.status !== 'withdrawn',
    );
    if (existing) {
      throw new BadRequestException('Application already exists for this job');
    }

    const application: JobApplicationRecord = {
      id: generateId(),
      jobId,
      applicantId,
      noteAr: dto.noteAr?.trim() || null,
      status: 'pending',
      appliedAt: nowIso(),
      resolvedAt: null,
    };

    this.applications.unshift(application);
    return application;
  }

  async findApplications(
    jobId: string,
    requesterId: string,
    requesterRole?: string,
  ): Promise<PaginatedResponse<JobApplicationRecord>> {
    const job = this.requireJob(jobId);
    this.assertPosterOrAdmin(job, requesterId, requesterRole);

    const apps = this.applications
      .filter((app) => app.jobId === jobId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

    return paginate(apps, apps.length, 0, apps.length || 20);
  }

  async updateApplicationStatus(
    jobId: string,
    appId: string,
    requesterId: string,
    dto: UpdateJobApplicationDto,
    requesterRole?: string,
  ): Promise<JobApplicationRecord> {
    const job = this.requireJob(jobId);
    this.assertPosterOrAdmin(job, requesterId, requesterRole);

    const app = this.requireApplication(jobId, appId);
    const current = app.status;
    const next = dto.status;

    if (!this.isValidTransition(current, next)) {
      throw new BadRequestException(`Cannot move application from ${current} to ${next}`);
    }

    app.status = next;
    app.resolvedAt = nowIso();

    if (next === 'in_progress') {
      job.status = 'in_progress';
    }
    if (next === 'completed') {
      job.status = 'completed';
    }

    return app;
  }

  async withdrawApplication(
    jobId: string,
    appId: string,
    applicantId: string,
  ): Promise<{ success: true }> {
    const app = this.requireApplication(jobId, appId);

    if (app.applicantId !== applicantId) {
      throw new ForbiddenException('Not your application');
    }
    if (app.status !== 'pending') {
      throw new BadRequestException('Only pending applications can be withdrawn');
    }

    app.status = 'withdrawn';
    app.resolvedAt = nowIso();
    return { success: true };
  }

  async submitReview(
    jobId: string,
    appId: string,
    reviewerId: string,
    dto: CreateJobReviewDto,
  ): Promise<JobReviewRecord> {
    const job = this.requireJob(jobId);
    const app = this.requireApplication(jobId, appId);

    if (app.status !== 'completed') {
      throw new BadRequestException('Reviews require a completed application');
    }

    let direction: JobReviewRecord['direction'];
    let revieweeId: string;

    if (reviewerId === job.posterId) {
      direction = 'poster_rates_worker';
      revieweeId = app.applicantId;
    } else if (reviewerId === app.applicantId) {
      direction = 'worker_rates_poster';
      revieweeId = job.posterId;
    } else {
      throw new ForbiddenException('Not allowed to review this application');
    }

    const duplicate = this.reviews.find(
      (review) => review.applicationId === appId && review.direction === direction,
    );
    if (duplicate) {
      throw new BadRequestException('Review already submitted');
    }

    const review: JobReviewRecord = {
      id: generateId(),
      jobId,
      applicationId: appId,
      reviewerId,
      revieweeId,
      direction,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
      createdAt: nowIso(),
    };

    this.reviews.unshift(review);
    return review;
  }

  async findUserReviews(userId: string): Promise<JobReviewRecord[]> {
    return this.reviews
      .filter((review) => review.reviewerId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private requireJob(id: string): JobPostRecord {
    const job = this.jobs.find((item) => item.id === id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private requireApplication(jobId: string, appId: string): JobApplicationRecord {
    const app = this.applications.find((item) => item.jobId === jobId && item.id === appId);
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    return app;
  }

  private assertPosterOrAdmin(job: JobPostRecord, requesterId: string, requesterRole?: string): void {
    if (requesterId === job.posterId || requesterRole === UserRoleEnum.ADMIN) {
      return;
    }
    throw new ForbiddenException('Not allowed to manage this job');
  }

  private isValidTransition(
    current: JobApplicationRecord['status'],
    next: UpdateJobApplicationDto['status'],
  ): boolean {
    if (current === 'pending') {
      return next === 'accepted' || next === 'rejected';
    }
    if (current === 'accepted') {
      return next === 'in_progress';
    }
    if (current === 'in_progress') {
      return next === 'completed';
    }
    return false;
  }
}
