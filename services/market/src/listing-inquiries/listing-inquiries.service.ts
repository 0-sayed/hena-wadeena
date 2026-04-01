import { DRIZZLE_CLIENT, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from '../db/schema';
import { listingInquiries } from '../db/schema/listing-inquiries';
import { listings } from '../db/schema/listings';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import type { CreateListingInquiryDto } from './dto/create-listing-inquiry.dto';
import type { QueryListingInquiriesDto } from './dto/query-listing-inquiries.dto';
import type { ReplyListingInquiryDto } from './dto/reply-listing-inquiry.dto';

type ListingInquiry = typeof listingInquiries.$inferSelect;

export type ListingInquiryRecord = ListingInquiry & {
  listingTitle: string;
  listingOwnerId: string;
};

@Injectable()
export class ListingInquiriesService {
  private readonly logger = new Logger(ListingInquiriesService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async submit(
    listingId: string,
    senderId: string,
    dto: CreateListingInquiryDto,
  ): Promise<ListingInquiry> {
    const [listing] = await this.db
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        status: listings.status,
        titleAr: listings.titleAr,
      })
      .from(listings)
      .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
      .limit(1);

    if (listing?.status !== 'active') {
      throw new NotFoundException('Listing not found');
    }

    if (listing.ownerId === senderId) {
      throw new ForbiddenException('Cannot inquire about your own listing');
    }

    const inquiry = firstOrThrow(
      await this.db
        .insert(listingInquiries)
        .values({
          listingId,
          senderId,
          receiverId: listing.ownerId,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          message: dto.message,
        })
        .returning(),
    );

    this.redisStreams
      .publish(EVENTS.LISTING_INQUIRY_RECEIVED, {
        inquiryId: inquiry.id,
        listingId,
        senderId,
        receiverId: listing.ownerId,
        listingTitle: listing.titleAr,
        senderName: dto.contactName,
      })
      .catch((error: unknown) => {
        this.logger.error(`Failed to publish ${EVENTS.LISTING_INQUIRY_RECEIVED}`, error);
      });

    return inquiry;
  }

  async findReceived(
    ownerId: string,
    query: QueryListingInquiriesDto,
  ): Promise<PaginatedResponse<ListingInquiryRecord>> {
    const conditions = [eq(listingInquiries.receiverId, ownerId), isNull(listings.deletedAt)];
    if (query.status !== undefined) {
      conditions.push(eq(listingInquiries.status, query.status));
    }

    const where = andRequired(...conditions);
    const [results, countResult] = await Promise.all([
      this.db
        .select({
          id: listingInquiries.id,
          listingId: listingInquiries.listingId,
          listingTitle: listings.titleAr,
          listingOwnerId: listings.ownerId,
          senderId: listingInquiries.senderId,
          receiverId: listingInquiries.receiverId,
          contactName: listingInquiries.contactName,
          contactEmail: listingInquiries.contactEmail,
          contactPhone: listingInquiries.contactPhone,
          message: listingInquiries.message,
          replyMessage: listingInquiries.replyMessage,
          status: listingInquiries.status,
          readAt: listingInquiries.readAt,
          respondedAt: listingInquiries.respondedAt,
          createdAt: listingInquiries.createdAt,
          updatedAt: listingInquiries.updatedAt,
        })
        .from(listingInquiries)
        .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
        .where(where)
        .orderBy(desc(listingInquiries.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listingInquiries)
        .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
        .where(where),
    ]);

    return paginate(results, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async findSent(
    senderId: string,
    query: QueryListingInquiriesDto,
  ): Promise<PaginatedResponse<ListingInquiryRecord>> {
    const conditions = [eq(listingInquiries.senderId, senderId), isNull(listings.deletedAt)];
    if (query.status !== undefined) {
      conditions.push(eq(listingInquiries.status, query.status));
    }

    const where = andRequired(...conditions);
    const [results, countResult] = await Promise.all([
      this.db
        .select({
          id: listingInquiries.id,
          listingId: listingInquiries.listingId,
          listingTitle: listings.titleAr,
          listingOwnerId: listings.ownerId,
          senderId: listingInquiries.senderId,
          receiverId: listingInquiries.receiverId,
          contactName: listingInquiries.contactName,
          contactEmail: listingInquiries.contactEmail,
          contactPhone: listingInquiries.contactPhone,
          message: listingInquiries.message,
          replyMessage: listingInquiries.replyMessage,
          status: listingInquiries.status,
          readAt: listingInquiries.readAt,
          respondedAt: listingInquiries.respondedAt,
          createdAt: listingInquiries.createdAt,
          updatedAt: listingInquiries.updatedAt,
        })
        .from(listingInquiries)
        .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
        .where(where)
        .orderBy(desc(listingInquiries.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listingInquiries)
        .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
        .where(where),
    ]);

    return paginate(results, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async markRead(id: string, ownerId: string): Promise<ListingInquiry> {
    const inquiry = await this.findInquiryForReceiver(id, ownerId);
    const now = inquiry.readAt ?? new Date();

    const [updated] = await this.db
      .update(listingInquiries)
      .set({
        status: inquiry.status === 'pending' ? 'read' : inquiry.status,
        readAt: now,
        updatedAt: new Date(),
      })
      .where(eq(listingInquiries.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Listing inquiry not found');
    return updated;
  }

  async reply(id: string, ownerId: string, dto: ReplyListingInquiryDto): Promise<ListingInquiry> {
    const inquiry = await this.findInquiryForReceiver(id, ownerId);
    const now = new Date();
    const [updated] = await this.db
      .update(listingInquiries)
      .set({
        status: 'replied',
        readAt: inquiry.readAt ?? now,
        replyMessage: dto.message,
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(listingInquiries.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Listing inquiry not found');

    this.redisStreams
      .publish(EVENTS.LISTING_INQUIRY_REPLIED, {
        inquiryId: updated.id,
        listingId: updated.listingId,
        senderId: inquiry.senderId,
        receiverId: ownerId,
        listingTitle: inquiry.listingTitle,
      })
      .catch((error: unknown) => {
        this.logger.error(`Failed to publish ${EVENTS.LISTING_INQUIRY_REPLIED}`, error);
      });

    return updated;
  }

  private async findInquiryForReceiver(id: string, receiverId: string): Promise<ListingInquiryRecord> {
    const [inquiryRecord] = await this.db
      .select({
        id: listingInquiries.id,
        listingId: listingInquiries.listingId,
        listingTitle: listings.titleAr,
        listingOwnerId: listings.ownerId,
        senderId: listingInquiries.senderId,
        receiverId: listingInquiries.receiverId,
        contactName: listingInquiries.contactName,
        contactEmail: listingInquiries.contactEmail,
        contactPhone: listingInquiries.contactPhone,
        message: listingInquiries.message,
        replyMessage: listingInquiries.replyMessage,
        status: listingInquiries.status,
        readAt: listingInquiries.readAt,
        respondedAt: listingInquiries.respondedAt,
        createdAt: listingInquiries.createdAt,
        updatedAt: listingInquiries.updatedAt,
      })
      .from(listingInquiries)
      .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
      .where(
        and(
          eq(listingInquiries.id, id),
          eq(listingInquiries.receiverId, receiverId),
          isNull(listings.deletedAt),
        ),
      )
      .limit(1);

    if (!inquiryRecord) {
      throw new NotFoundException('Listing inquiry not found');
    }

    return inquiryRecord;
  }
}
