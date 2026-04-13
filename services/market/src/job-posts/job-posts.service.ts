import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SQL, and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { jobPosts } from '../db/schema/job-posts';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import { CreateJobPostDto } from './dto/create-job-post.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';

export type JobPost = typeof jobPosts.$inferSelect;
type InsertJobPost = typeof jobPosts.$inferInsert;

@Injectable()
export class JobPostsService {
  private readonly logger = new Logger(JobPostsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async create(posterId: string, dto: CreateJobPostDto): Promise<JobPost> {
    const job = firstOrThrow(
      await this.db
        .insert(jobPosts)
        .values({
          posterId,
          title: dto.title,
          descriptionAr: dto.descriptionAr,
          descriptionEn: dto.descriptionEn ?? null,
          category: dto.category as InsertJobPost['category'],
          area: dto.area,
          compensation: dto.compensation,
          compensationType: dto.compensationType as InsertJobPost['compensationType'],
          slots: dto.slots,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        })
        .returning(),
    );
    this.redisStreams.publish(EVENTS.JOB_POSTED, { jobId: job.id, posterId }).catch((err) => {
      this.logger.error('JOB_POSTED event failed', err);
    });
    return job;
  }

  private buildFilters(query: QueryJobsDto): SQL {
    const conditions: SQL[] = [isNull(jobPosts.deletedAt), eq(jobPosts.status, 'open')];
    if (query.category)
      conditions.push(eq(jobPosts.category, query.category as JobPost['category']));
    if (query.area) conditions.push(eq(jobPosts.area, query.area));
    if (query.compensationType) {
      const ct = query.compensationType as JobPost['compensationType'];
      conditions.push(eq(jobPosts.compensationType, ct));
    }
    const result = and(...conditions);
    if (!result) throw new Error('and() returned undefined — no conditions provided');
    return result;
  }

  private async countJobs(filters: SQL): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobPosts)
      .where(filters);
    return result[0]?.count ?? 0;
  }

  async findAll(query: QueryJobsDto): Promise<PaginatedResponse<JobPost>> {
    const filters = this.buildFilters(query);

    const [items, total] = await Promise.all([
      this.db
        .select()
        .from(jobPosts)
        .where(filters)
        .orderBy(desc(jobPosts.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.countJobs(filters),
    ]);

    return paginate(items, total, query.offset, query.limit);
  }

  async findById(id: string): Promise<JobPost> {
    const job = await this.findRaw(id);
    if (!job) throw new NotFoundException('Job post not found');
    return job;
  }

  async findRaw(id: string): Promise<JobPost | null> {
    const [job] = await this.db
      .select()
      .from(jobPosts)
      .where(and(eq(jobPosts.id, id), isNull(jobPosts.deletedAt)))
      .limit(1);
    return job ?? null;
  }

  async findMyPosts(posterId: string, query: QueryJobsDto): Promise<PaginatedResponse<JobPost>> {
    const filters = andRequired(eq(jobPosts.posterId, posterId), isNull(jobPosts.deletedAt));
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(jobPosts)
        .where(filters)
        .orderBy(desc(jobPosts.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobPosts)
        .where(filters),
    ]);
    return paginate(items, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async update(id: string, callerId: string, dto: UpdateJobPostDto): Promise<JobPost> {
    const job = await this.findById(id);
    if (job.posterId !== callerId)
      throw new ForbiddenException('Only the poster can update this job');
    if (job.status !== 'open') throw new ConflictException('Only open jobs can be updated');
    const updates: Partial<InsertJobPost> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.descriptionAr !== undefined) updates.descriptionAr = dto.descriptionAr;
    if (dto.descriptionEn !== undefined) updates.descriptionEn = dto.descriptionEn;
    if (dto.category !== undefined) updates.category = dto.category as InsertJobPost['category'];
    if (dto.area !== undefined) updates.area = dto.area;
    if (dto.compensation !== undefined) updates.compensation = dto.compensation;
    if (dto.compensationType !== undefined)
      updates.compensationType = dto.compensationType as InsertJobPost['compensationType'];
    if (dto.slots !== undefined) updates.slots = dto.slots;
    if (dto.startsAt !== undefined) updates.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) updates.endsAt = new Date(dto.endsAt);
    updates.updatedAt = new Date();
    return firstOrThrow(
      await this.db
        .update(jobPosts)
        .set(updates)
        .where(and(eq(jobPosts.id, id), isNull(jobPosts.deletedAt)))
        .returning(),
    );
  }

  async remove(id: string, callerId: string): Promise<void> {
    const job = await this.findById(id);
    if (job.posterId !== callerId)
      throw new ForbiddenException('Only the poster can delete this job');
    await this.db
      .update(jobPosts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(jobPosts.id, id));
  }
}
