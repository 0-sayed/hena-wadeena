import {
  DRIZZLE_CLIENT,
  RedisStreamsService,
  firstOrThrow,
  isForeignKeyViolation,
  isUniqueViolation,
  paginate,
} from '@hena-wadeena/nest-common';
import { EVENTS, UserRole } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SQL, and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { bookings } from '../db/schema/bookings';
import { guideReviewHelpfulVotes } from '../db/schema/guide-review-helpful-votes';
import { guides } from '../db/schema/guides';
import { guideReviews } from '../db/schema/reviews';

import type { CreateReviewDto } from './dto/create-review.dto';
import type { QueryReviewsDto } from './dto/query-reviews.dto';
import type { ReplyReviewDto } from './dto/reply-review.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';

type Review = typeof guideReviews.$inferSelect;

/** Roles permitted to moderate (soft-delete) reviews by others. */
const MODERATOR_ROLES: ReadonlySet<string> = new Set([UserRole.ADMIN]);

const SORTABLE_FIELDS = {
  created_at: guideReviews.createdAt,
  rating: guideReviews.rating,
  helpful_count: guideReviews.helpfulCount,
} as const;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  /**
   * Recalculates rating_avg and rating_count on the guide from active reviews.
   * Must be called inside a transaction.
   */
  private async recalculateRating(tx: PostgresJsDatabase, guideId: string): Promise<void> {
    await tx.execute(sql`
      UPDATE guide_booking.guides g
      SET rating_avg = COALESCE(agg.avg_rating, 0),
          rating_count = agg.cnt,
          updated_at = NOW()
      FROM (
        SELECT AVG(rating)::real AS avg_rating, COUNT(*)::int AS cnt
        FROM guide_booking.guide_reviews
        WHERE guide_id = ${guideId} AND is_active = true
      ) agg
      WHERE g.id = ${guideId}
    `);
  }

  /** Fetch a review by ID, only if active. Throws NotFoundException otherwise. */
  private async findActiveReview(id: string): Promise<Review> {
    const [review] = await this.db
      .select()
      .from(guideReviews)
      .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
      .limit(1);

    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async create(dto: CreateReviewDto, reviewerId: string): Promise<Review> {
    let review: Review;
    try {
      review = await this.db.transaction(async (tx) => {
        // 1. Verify booking exists
        const [booking] = await tx
          .select({
            id: bookings.id,
            guideId: bookings.guideId,
            touristId: bookings.touristId,
            status: bookings.status,
          })
          .from(bookings)
          .where(eq(bookings.id, dto.bookingId))
          .limit(1);

        if (!booking) throw new NotFoundException('Booking not found');

        // 2. Booking must be completed
        if (booking.status !== 'completed') {
          throw new BadRequestException('Booking must be completed before reviewing');
        }

        // 3. Only the tourist on this booking can review
        if (booking.touristId !== reviewerId) {
          throw new ForbiddenException('Only the booking tourist can submit a review');
        }

        // 4. Insert review
        const created = firstOrThrow(
          await tx
            .insert(guideReviews)
            .values({
              bookingId: dto.bookingId,
              guideId: booking.guideId,
              reviewerId,
              rating: dto.rating,
              title: dto.title,
              comment: dto.comment,
              images: dto.images,
            })
            .returning(),
        );

        // 5. Recalculate guide rating
        await this.recalculateRating(tx, booking.guideId);
        return created;
      });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('You have already reviewed this booking');
      }
      throw err;
    }

    // 6. Publish event (fire-and-forget)
    this.redisStreams
      .publish(EVENTS.REVIEW_SUBMITTED, {
        reviewId: review.id,
        targetType: 'guide',
        targetId: review.guideId,
        rating: String(review.rating),
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to publish review.submitted event', err);
      });

    return review;
  }

  async findById(id: string): Promise<Review> {
    return this.findActiveReview(id);
  }

  async update(id: string, dto: UpdateReviewDto, callerId: string): Promise<Review> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(guideReviews)
        .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
        .limit(1);

      if (!existing) throw new NotFoundException('Review not found');

      if (existing.reviewerId !== callerId) {
        throw new ForbiddenException('Not the review author');
      }

      const ratingChanged = dto.rating !== undefined && dto.rating !== existing.rating;

      const [row] = await tx
        .update(guideReviews)
        .set({
          ...(dto.rating !== undefined && { rating: dto.rating }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.comment !== undefined && { comment: dto.comment }),
          ...(dto.images !== undefined && { images: dto.images }),
          updatedAt: new Date(),
        })
        .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
        .returning();

      if (!row) throw new NotFoundException('Review not found');

      if (ratingChanged) {
        await this.recalculateRating(tx, existing.guideId);
      }

      return row;
    });
  }

  async remove(id: string, callerId: string, callerRole: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(guideReviews)
        .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
        .limit(1);

      if (!existing) throw new NotFoundException('Review not found');

      const isAuthor = existing.reviewerId === callerId;
      const isModerator = MODERATOR_ROLES.has(callerRole);

      if (!isAuthor && !isModerator) {
        throw new ForbiddenException('Not the review author');
      }

      await tx
        .update(guideReviews)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(guideReviews.id, id));

      await this.recalculateRating(tx, existing.guideId);
    });
  }

  /**
   * Resolves the guide entity ID for a user ID.
   * Avoids circular dependency on GuidesModule.
   */
  private async resolveGuideId(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ id: guides.id })
      .from(guides)
      .where(and(eq(guides.userId, userId), isNull(guides.deletedAt)))
      .limit(1);

    if (!row) throw new NotFoundException('Guide profile not found');
    return row.id;
  }

  async reply(id: string, dto: ReplyReviewDto, callerUserId: string): Promise<Review> {
    const callerGuideId = await this.resolveGuideId(callerUserId);
    const existing = await this.findActiveReview(id);

    if (existing.guideId !== callerGuideId) {
      throw new ForbiddenException('Only the reviewed guide can reply');
    }

    const [updated] = await this.db
      .update(guideReviews)
      .set({ guideReply: dto.guideReply, updatedAt: new Date() })
      .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
      .returning();

    if (!updated) throw new NotFoundException('Review not found');
    return updated;
  }

  async markHelpful(id: string, userId: string): Promise<Review> {
    try {
      return await this.db.transaction(async (tx) => {
        // Verify review exists and is active before accepting the vote
        const [review] = await tx
          .select({ id: guideReviews.id })
          .from(guideReviews)
          .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
          .limit(1);

        if (!review) throw new NotFoundException('Review not found');

        await tx.insert(guideReviewHelpfulVotes).values({ reviewId: id, userId });

        const [updated] = await tx
          .update(guideReviews)
          .set({ helpfulCount: sql`${guideReviews.helpfulCount} + 1` })
          .where(and(eq(guideReviews.id, id), eq(guideReviews.isActive, true)))
          .returning();

        if (!updated) throw new NotFoundException('Review not found');
        return updated;
      });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('You have already marked this review as helpful');
      }
      if (isForeignKeyViolation(err)) {
        throw new NotFoundException('Review not found');
      }
      throw err;
    }
  }

  async findByGuide(guideId: string, query: QueryReviewsDto) {
    return this.findPaginated(
      and(eq(guideReviews.guideId, guideId), eq(guideReviews.isActive, true)),
      query,
    );
  }

  async findMine(reviewerId: string, query: QueryReviewsDto) {
    return this.findPaginated(
      and(eq(guideReviews.reviewerId, reviewerId), eq(guideReviews.isActive, true)),
      query,
    );
  }

  private buildSort(sort = 'created_at|desc'): SQL[] {
    const [field, direction] = sort.split('|');
    if (!field || !(field in SORTABLE_FIELDS)) {
      return [desc(guideReviews.createdAt), desc(guideReviews.id)];
    }
    const column = SORTABLE_FIELDS[field as keyof typeof SORTABLE_FIELDS];
    const primary = direction === 'asc' ? asc(column) : desc(column);
    const tieBreaker = direction === 'asc' ? asc(guideReviews.id) : desc(guideReviews.id);
    return [primary, tieBreaker];
  }

  private async findPaginated(filters: SQL | undefined, query: QueryReviewsDto) {
    const orderBy = this.buildSort(query.sort);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(guideReviews)
        .where(filters)
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(guideReviews)
        .where(filters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(data, total, query.offset, query.limit);
  }
}
