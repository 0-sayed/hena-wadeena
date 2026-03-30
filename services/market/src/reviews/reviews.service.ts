import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, UserRole } from '@hena-wadeena/types';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, asc, eq, isNull, sql, SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { listings } from '../db/schema/listings';
import { reviewHelpfulVotes } from '../db/schema/review-helpful-votes';
import { reviews } from '../db/schema/reviews';
import { isForeignKeyViolation, isUniqueViolation } from '../shared/error-helpers';
import { firstOrThrow, paginate } from '../shared/query-helpers';

import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

type Review = typeof reviews.$inferSelect;

/** Roles permitted to moderate (soft-delete) reviews by others. */
const MODERATOR_ROLES: ReadonlySet<string> = new Set([UserRole.ADMIN]);

const SORTABLE_FIELDS = {
  created_at: reviews.createdAt,
  rating: reviews.rating,
  helpful_count: reviews.helpfulCount,
} as const;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly redisStreams: RedisStreamsService,
  ) {}

  /**
   * Recalculates rating_avg and review_count on the listing from active reviews.
   * Must be called inside a transaction.
   */
  private async recalculateRating(tx: PostgresJsDatabase, listingId: string): Promise<void> {
    await tx.execute(sql`
      UPDATE market.listings
      SET rating_avg = COALESCE(
            (SELECT AVG(rating)::real FROM market.reviews
             WHERE listing_id = ${listingId} AND is_active = true), 0),
          review_count = (SELECT COUNT(*)::int FROM market.reviews
                          WHERE listing_id = ${listingId} AND is_active = true),
          updated_at = NOW()
      WHERE id = ${listingId}
    `);
  }

  /** Fetch a review by ID, only if active. Throws NotFoundException otherwise. */
  private async findActiveReview(id: string): Promise<Review> {
    const [review] = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
      .limit(1);

    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private buildSort(sort: string): SQL[] {
    const [field, direction] = sort.split('|');
    if (!field || !(field in SORTABLE_FIELDS)) {
      return [desc(reviews.createdAt), desc(reviews.id)];
    }
    const column = SORTABLE_FIELDS[field as keyof typeof SORTABLE_FIELDS];
    const primary = direction === 'asc' ? asc(column) : desc(column);
    const tieBreaker = direction === 'asc' ? asc(reviews.id) : desc(reviews.id);
    return [primary, tieBreaker];
  }

  async create(dto: CreateReviewDto, reviewerId: string): Promise<Review> {
    let result: { review: Review; listingOwnerId: string };
    try {
      result = await this.db.transaction(async (tx) => {
        // 1. Verify listing exists and is active (inside tx for atomicity)
        const [listing] = await tx
          .select({ id: listings.id, ownerId: listings.ownerId })
          .from(listings)
          .where(
            and(
              eq(listings.id, dto.listingId),
              eq(listings.status, 'active'),
              isNull(listings.deletedAt),
            ),
          )
          .limit(1);

        if (!listing) throw new NotFoundException('Listing not found');

        // 2. Cannot review own listing
        if (listing.ownerId === reviewerId) {
          throw new ForbiddenException('Cannot review your own listing');
        }

        // 3. Insert + recalculate
        const created = firstOrThrow(
          await tx
            .insert(reviews)
            .values({
              listingId: dto.listingId,
              reviewerId,
              rating: dto.rating,
              title: dto.title,
              comment: dto.comment,
              images: dto.images,
            })
            .returning(),
        );

        await this.recalculateRating(tx, dto.listingId);
        return { review: created, listingOwnerId: listing.ownerId };
      });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('You have already reviewed this listing');
      }
      throw err;
    }

    const { review, listingOwnerId } = result;

    // 5. Publish event (fire-and-forget)
    this.redisStreams
      .publish(EVENTS.REVIEW_SUBMITTED, {
        reviewId: review.id,
        targetType: 'listing',
        targetId: dto.listingId,
        targetUserId: listingOwnerId,
        rating: String(review.rating),
        reviewerId: review.reviewerId,
        listingOwnerId,
        createdAt: review.createdAt.toISOString(),
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
    const existing = await this.findActiveReview(id);

    if (existing.reviewerId !== callerId) {
      throw new ForbiddenException('Not the review author');
    }

    const ratingChanged = dto.rating !== undefined && dto.rating !== existing.rating;

    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(reviews)
        .set({
          ...(dto.rating !== undefined && { rating: dto.rating }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.comment !== undefined && { comment: dto.comment }),
          ...(dto.images !== undefined && { images: dto.images }),
          updatedAt: new Date(),
        })
        .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
        .returning();

      if (!row) throw new NotFoundException('Review not found');

      if (ratingChanged) {
        await this.recalculateRating(tx, existing.listingId);
      }

      return row;
    });

    return updated;
  }

  async remove(id: string, callerId: string, callerRole: string): Promise<void> {
    const existing = await this.findActiveReview(id);

    const isAuthor = existing.reviewerId === callerId;
    const isModerator = MODERATOR_ROLES.has(callerRole);

    if (!isAuthor && !isModerator) {
      throw new ForbiddenException('Not the review author');
    }

    await this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .update(reviews)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
        .returning({ id: reviews.id });

      if (!deleted) throw new NotFoundException('Review not found');

      await this.recalculateRating(tx, existing.listingId);
    });
  }

  async markHelpful(id: string, userId: string): Promise<Review> {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.insert(reviewHelpfulVotes).values({ reviewId: id, userId });

        const [updated] = await tx
          .update(reviews)
          .set({ helpfulCount: sql`${reviews.helpfulCount} + 1` })
          .where(and(eq(reviews.id, id), eq(reviews.isActive, true)))
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

  async findByListing(listingId: string, query: QueryReviewsDto) {
    return this.findPaginated(
      and(eq(reviews.listingId, listingId), eq(reviews.isActive, true)),
      query,
    );
  }

  async findMine(reviewerId: string, query: QueryReviewsDto) {
    return this.findPaginated(
      and(eq(reviews.reviewerId, reviewerId), eq(reviews.isActive, true)),
      query,
    );
  }

  private async findPaginated(filters: SQL | undefined, query: QueryReviewsDto) {
    const orderBy = this.buildSort(query.sort);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(reviews)
        .where(filters)
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(reviews)
        .where(filters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(data, total, query.offset, query.limit);
  }
}
