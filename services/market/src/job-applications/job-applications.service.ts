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
import { and, eq, getTableColumns, inArray, isNull, sql } from 'drizzle-orm';
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
    // Fix 1: Poster cannot apply to their own job
    if (job.posterId === applicantId)
      throw new ForbiddenException('لا يمكنك التقدم لوظيفتك الخاصة');

    // Check for an existing application (unique constraint on applicant+job)
    const [existing] = await this.db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)))
      .limit(1);

    if (existing) {
      if (existing.status === 'withdrawn') {
        // Re-activate the withdrawn application
        // Fix 2: Also guard on current status to prevent re-activating a non-withdrawn row in a race
        const [reactivated] = await this.db
          .update(jobApplications)
          .set({ status: 'pending', noteAr: dto.noteAr ?? existing.noteAr, resolvedAt: null })
          .where(and(eq(jobApplications.id, existing.id), eq(jobApplications.status, 'withdrawn')))
          .returning();
        if (!reactivated) throw new ConflictException('Failed to re-activate application');
        return reactivated;
      }
      throw new ConflictException('You have already applied for this job');
    }

    // Fix 3: Use onConflictDoNothing to guard against duplicate-apply race condition
    const [app] = await this.db
      .insert(jobApplications)
      .values({ jobId, applicantId, status: 'pending', noteAr: dto.noteAr })
      .onConflictDoNothing({ target: [jobApplications.applicantId, jobApplications.jobId] })
      .returning();
    if (!app) throw new ConflictException('You have already applied for this job');

    this.redisStreams
      .publish(EVENTS.JOB_APPLICATION_RECEIVED, { jobId, applicantId, appId: app.id })
      .catch((err) => {
        this.logger.error('JOB_APPLICATION_RECEIVED event failed', err);
      });

    return app;
  }

  // Fix 4: Require callerId and enforce poster-only access
  async findApplicationsForJob(
    jobId: string,
    callerId: string,
  ): Promise<PaginatedResponse<JobApplication>> {
    const job = await this.jobPostsService.findRaw(jobId);
    if (!job) throw new NotFoundException('Job post not found');
    if (job.posterId !== callerId)
      throw new ForbiddenException('Only the job poster can view applications');

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
        // Fix 5: Exclude soft-deleted job posts
        .innerJoin(
          jobPosts,
          and(eq(jobApplications.jobId, jobPosts.id), isNull(jobPosts.deletedAt)),
        )
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

    // Fix 8a: Transfer payment BEFORE committing status — if transfer fails, DB stays unchanged
    if (dto.status === 'completed') {
      await this.transferWalletForJob(
        job.posterId,
        app.applicantId,
        job.compensation,
        jobId,
        appId,
      );
    }

    // Fix 6 + Fix 7: Slot enforcement with 'completed' included, wrapped in a transaction
    let updated: typeof jobApplications.$inferSelect;

    if (dto.status === 'accepted') {
      const txResult = await this.db.transaction(async (tx) => {
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(jobApplications)
          .where(
            and(
              eq(jobApplications.jobId, jobId),
              // Fix 6: Include 'completed' in slot count
              inArray(jobApplications.status, ['accepted', 'in_progress', 'completed']),
            ),
          )
          .execute();
        if ((countResult?.count ?? 0) >= job.slots) {
          throw new ConflictException('All slots for this job are filled');
        }
        const [u] = await tx
          .update(jobApplications)
          .set({ status: dto.status, resolvedAt: new Date() })
          .where(and(eq(jobApplications.id, appId), eq(jobApplications.status, app.status)))
          .returning();
        if (!u) throw new ConflictException('Application state changed concurrently');
        return u;
      });
      updated = txResult;
    } else {
      const [u] = await this.db
        .update(jobApplications)
        .set({ status: dto.status, resolvedAt: new Date() })
        .where(and(eq(jobApplications.id, appId), eq(jobApplications.status, app.status)))
        .returning();
      if (!u) throw new ConflictException('Application state changed concurrently');
      updated = u;
    }

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
      // Fix 8c: wallet transfer moved before the DB update; only fire the event here
      this.redisStreams
        .publish(EVENTS.JOB_COMPLETED, { appId, applicantId: app.applicantId, jobId })
        .catch((err) => {
          this.logger.error('JOB_COMPLETED event failed', err);
        });
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
        // Fix 9: Exclude soft-deleted job posts
        .innerJoin(jobPosts, and(eq(jobReviews.jobId, jobPosts.id), isNull(jobPosts.deletedAt)))
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

  // Fix 8a: Remove try/catch — let HTTP errors propagate so a failed transfer
  // prevents the caller from committing the 'completed' status update.
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

    await firstValueFrom(
      this.httpService.post(`${this.identityUrl}/api/v1/internal/wallet/transfer`, payload, {
        headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
      }),
    );
  }
}
