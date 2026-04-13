import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import type { PaginatedResponse, WalletTransferRequest } from '@hena-wadeena/types';
import { HttpService } from '@nestjs/axios';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { firstValueFrom } from 'rxjs';

import { jobApplications } from '../db/schema/job-applications';
import { jobPosts } from '../db/schema/job-posts';
import { jobReviews } from '../db/schema/job-reviews';
import { JobPostsService } from '../job-posts/job-posts.service';
import { firstOrThrow, paginate } from '../shared/query-helpers';

import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

type JobApplication = typeof jobApplications.$inferSelect;
type JobReview = typeof jobReviews.$inferSelect;
type InsertJobReview = typeof jobReviews.$inferInsert;

// Poster-driven state machine. Applicant withdrawal is handled separately.
const POSTER_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['in_progress'],
  in_progress: ['completed'],
};

// Only pending applications can be withdrawn by the applicant.
const WITHDRAWABLE_STATES = ['pending'] as const;

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);
  private readonly identityUrl = process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:8001';

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
    private readonly httpService: HttpService,
    private readonly jobPostsService: JobPostsService,
  ) {}

  // --- Public methods ---

  async apply(jobId: string, applicantId: string, dto: ApplyJobDto): Promise<JobApplication> {
    const job = await this.jobPostsService.findRaw(jobId);
    if (!job) throw new NotFoundException('Job post not found');
    if (job.status !== 'open')
      throw new ConflictException('This job is no longer accepting applications');

    // Check for an existing application (unique constraint on applicant+job)
    const [existing] = await this.db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)))
      .limit(1);

    if (existing) {
      if (existing.status === 'withdrawn') {
        // Re-activate the withdrawn application
        const [reactivated] = await this.db
          .update(jobApplications)
          .set({ status: 'pending', noteAr: dto.noteAr ?? existing.noteAr, resolvedAt: null })
          .where(eq(jobApplications.id, existing.id))
          .returning();
        if (!reactivated) throw new ConflictException('Failed to re-activate application');
        return reactivated;
      }
      throw new ConflictException('You have already applied for this job');
    }

    const app = firstOrThrow(
      await this.db
        .insert(jobApplications)
        .values({ jobId, applicantId, status: 'pending', noteAr: dto.noteAr })
        .returning(),
    );

    this.redisStreams
      .publish(EVENTS.JOB_APPLICATION_RECEIVED, { jobId, applicantId, appId: app.id })
      .catch((err) => {
        this.logger.error('JOB_APPLICATION_RECEIVED event failed', err);
      });

    return app;
  }

  async findApplicationsForJob(jobId: string): Promise<PaginatedResponse<JobApplication>> {
    const items = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId))
      .limit(200);
    return paginate(items, items.length, 0, 200);
  }

  async findMyApplications(
    applicantId: string,
    query: QueryReviewsDto,
  ): Promise<PaginatedResponse<JobApplication & { jobTitle: string }>> {
    const whereClause = eq(jobApplications.applicantId, applicantId);
    const [items, countResult] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(jobApplications),
          jobTitle: jobPosts.title,
        })
        .from(jobApplications)
        .innerJoin(jobPosts, eq(jobApplications.jobId, jobPosts.id))
        .where(whereClause)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobApplications)
        .where(whereClause),
    ]);
    return paginate(items, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async updateApplicationStatus(
    jobId: string,
    appId: string,
    callerId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<JobApplication> {
    // Find the application
    const [app] = await this.db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.id, appId), eq(jobApplications.jobId, jobId)))
      .limit(1);
    if (!app) throw new NotFoundException('Application not found');

    // Verify caller is the poster
    const job = await this.jobPostsService.findRaw(jobId);
    if (!job) throw new NotFoundException('Job post not found');
    if (job.posterId !== callerId)
      throw new ForbiddenException('Only the job poster can update application status');

    // State machine check
    const allowed = POSTER_TRANSITIONS[app.status];
    if (!allowed?.includes(dto.status)) {
      throw new ConflictException(`Invalid transition: ${app.status} → ${dto.status}`);
    }

    // Slots enforcement (only when accepting)
    if (dto.status === 'accepted') {
      const [countResult] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobId, jobId),
            inArray(jobApplications.status, ['accepted', 'in_progress']),
          ),
        )
        .execute();
      if ((countResult?.count ?? 0) >= job.slots) {
        throw new ConflictException('All slots for this job are filled');
      }
    }

    // Concurrent-safe update — WHERE clause includes current status
    const [updated] = await this.db
      .update(jobApplications)
      .set({ status: dto.status, resolvedAt: new Date() })
      .where(and(eq(jobApplications.id, appId), eq(jobApplications.status, app.status)))
      .returning();
    if (!updated) throw new ConflictException('Application state changed concurrently');

    // Post-transition side effects
    if (dto.status === 'accepted') {
      this.redisStreams
        .publish(EVENTS.JOB_APPLICATION_ACCEPTED, {
          appId,
          applicantId: app.applicantId,
          jobId,
        })
        .catch((err) => {
          this.logger.error('JOB_APPLICATION_ACCEPTED event failed', err);
        });
    }

    if (dto.status === 'completed') {
      this.redisStreams
        .publish(EVENTS.JOB_COMPLETED, { appId, applicantId: app.applicantId, jobId })
        .catch((err) => {
          this.logger.error('JOB_COMPLETED event failed', err);
        });
      await this.transferWalletForJob(
        job.posterId,
        app.applicantId,
        job.compensation,
        jobId,
        appId,
      );
    }

    return updated;
  }

  async withdrawApplication(
    jobId: string,
    appId: string,
    callerId: string,
  ): Promise<JobApplication> {
    const [app] = await this.db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.id, appId), eq(jobApplications.jobId, jobId)))
      .limit(1);
    if (!app) throw new NotFoundException('Application not found');
    if (app.applicantId !== callerId)
      throw new ForbiddenException('Only the applicant can withdraw');
    if (!(WITHDRAWABLE_STATES as readonly string[]).includes(app.status)) {
      throw new ConflictException(`Cannot withdraw an application with status: ${app.status}`);
    }

    const [updated] = await this.db
      .update(jobApplications)
      .set({ status: 'withdrawn', resolvedAt: new Date() })
      .where(and(eq(jobApplications.id, appId), eq(jobApplications.status, app.status)))
      .returning();
    if (!updated) throw new ConflictException('Application state changed concurrently');
    return updated;
  }

  async submitReview(
    jobId: string,
    appId: string,
    callerId: string,
    dto: CreateReviewDto,
  ): Promise<JobReview> {
    // Application must exist and be completed
    const [app] = await this.db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.id, appId), eq(jobApplications.jobId, jobId)))
      .limit(1);
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'completed')
      throw new ConflictException('Reviews can only be submitted for completed applications');

    // Verify caller is poster or applicant
    const job = await this.jobPostsService.findRaw(jobId);
    if (!job) throw new NotFoundException('Job post not found');
    const isPoster = job.posterId === callerId;
    const isApplicant = app.applicantId === callerId;
    if (!isPoster && !isApplicant)
      throw new ForbiddenException('Only the poster or applicant can submit a review');

    // Direction must match caller role
    if (dto.direction === 'poster_rates_worker' && !isPoster)
      throw new ForbiddenException('Only the poster can rate the worker');
    if (dto.direction === 'worker_rates_poster' && !isApplicant)
      throw new ForbiddenException('Only the worker can rate the poster');

    // Uniqueness check
    const [existing] = await this.db
      .select()
      .from(jobReviews)
      .where(
        and(
          eq(jobReviews.applicationId, appId),
          eq(jobReviews.direction, dto.direction as InsertJobReview['direction']),
        ),
      )
      .limit(1);
    if (existing) throw new ConflictException('Review already submitted for this direction');

    const revieweeId = isPoster ? app.applicantId : job.posterId;
    const review = firstOrThrow(
      await this.db
        .insert(jobReviews)
        .values({
          jobId,
          applicationId: appId,
          reviewerId: callerId,
          revieweeId,
          direction: dto.direction as InsertJobReview['direction'],
          rating: dto.rating,
          comment: dto.comment,
        })
        .returning(),
    );

    this.redisStreams
      .publish(EVENTS.JOB_REVIEW_SUBMITTED, {
        reviewId: review.id,
        revieweeId,
        jobId,
      })
      .catch((err) => {
        this.logger.error('JOB_REVIEW_SUBMITTED event failed', err);
      });

    return review;
  }

  async findUserReviews(
    userId: string,
    query: QueryReviewsDto,
  ): Promise<PaginatedResponse<JobReview & { jobTitle: string }>> {
    const whereClause =
      query.role === 'reviewer'
        ? eq(jobReviews.reviewerId, userId)
        : eq(jobReviews.revieweeId, userId);

    const [items, countResult] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(jobReviews),
          jobTitle: jobPosts.title,
        })
        .from(jobReviews)
        .innerJoin(jobPosts, eq(jobReviews.jobId, jobPosts.id))
        .where(whereClause)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobReviews)
        .where(whereClause),
    ]);

    return paginate(items, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  // --- Private helpers ---

  private async transferWalletForJob(
    posterId: string,
    applicantId: string,
    compensation: number,
    jobId: string,
    appId: string,
  ): Promise<void> {
    if (compensation === 0) return; // volunteer/barter — skip

    const payload: WalletTransferRequest = {
      fromUserId: posterId,
      toUserId: applicantId,
      amountPiasters: compensation,
      refType: 'job',
      refId: jobId,
      noteAr: 'أجر العمل',
      idempotencyKey: `job:${jobId}:app:${appId}`,
    };

    try {
      await firstValueFrom(
        this.httpService.post(`${this.identityUrl}/api/v1/internal/wallet/transfer`, payload, {
          headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        }),
      );
    } catch (err) {
      // Log and continue — state is already committed; wallet can be reconciled.
      this.logger.error(`Wallet transfer failed for job ${jobId} app ${appId}`, err);
    }
  }
}
