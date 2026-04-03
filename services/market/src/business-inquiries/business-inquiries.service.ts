import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from '../db/schema';
import { businessDirectories } from '../db/schema/business-directories';
import { businessInquiries } from '../db/schema/business-inquiries';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import type { CreateBusinessInquiryDto } from './dto/create-business-inquiry.dto';
import type { QueryBusinessInquiriesDto } from './dto/query-business-inquiries.dto';
import type { ReplyBusinessInquiryDto } from './dto/reply-business-inquiry.dto';

type BusinessInquiry = typeof businessInquiries.$inferSelect;

export type BusinessInquiryRecord = BusinessInquiry & {
  businessName: string;
  businessOwnerId: string;
};

const inquiryRecordColumns = {
  id: businessInquiries.id,
  businessId: businessInquiries.businessId,
  businessName: businessDirectories.nameAr,
  businessOwnerId: businessDirectories.ownerId,
  senderId: businessInquiries.senderId,
  receiverId: businessInquiries.receiverId,
  contactName: businessInquiries.contactName,
  contactEmail: businessInquiries.contactEmail,
  contactPhone: businessInquiries.contactPhone,
  message: businessInquiries.message,
  replyMessage: businessInquiries.replyMessage,
  status: businessInquiries.status,
  readAt: businessInquiries.readAt,
  respondedAt: businessInquiries.respondedAt,
  createdAt: businessInquiries.createdAt,
  updatedAt: businessInquiries.updatedAt,
};

@Injectable()
export class BusinessInquiriesService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async submit(
    businessId: string,
    senderId: string,
    dto: CreateBusinessInquiryDto,
  ): Promise<BusinessInquiry> {
    const [business] = await this.db
      .select({
        id: businessDirectories.id,
        ownerId: businessDirectories.ownerId,
        status: businessDirectories.status,
        verificationStatus: businessDirectories.verificationStatus,
        nameAr: businessDirectories.nameAr,
      })
      .from(businessDirectories)
      .where(and(eq(businessDirectories.id, businessId), isNull(businessDirectories.deletedAt)))
      .limit(1);

    if (business?.status !== 'active' || business.verificationStatus !== 'verified') {
      throw new NotFoundException('Business not found');
    }

    if (business.ownerId === senderId) {
      throw new ForbiddenException('Cannot inquire about your own business');
    }

    return firstOrThrow(
      await this.db
        .insert(businessInquiries)
        .values({
          businessId,
          senderId,
          receiverId: business.ownerId,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          message: dto.message,
        })
        .returning(),
    );
  }

  async findReceived(
    ownerId: string,
    query: QueryBusinessInquiriesDto,
  ): Promise<PaginatedResponse<BusinessInquiryRecord>> {
    const conditions = [
      eq(businessInquiries.receiverId, ownerId),
      isNull(businessDirectories.deletedAt),
    ];
    if (query.status !== undefined) {
      conditions.push(eq(businessInquiries.status, query.status));
    }

    return this.findInquiries(andRequired(...conditions), query);
  }

  async findSent(
    senderId: string,
    query: QueryBusinessInquiriesDto,
  ): Promise<PaginatedResponse<BusinessInquiryRecord>> {
    const conditions = [
      eq(businessInquiries.senderId, senderId),
      isNull(businessDirectories.deletedAt),
    ];
    if (query.status !== undefined) {
      conditions.push(eq(businessInquiries.status, query.status));
    }

    return this.findInquiries(andRequired(...conditions), query);
  }

  async markRead(id: string, ownerId: string): Promise<BusinessInquiryRecord> {
    const inquiry = await this.findInquiryForReceiver(id, ownerId);
    const now = inquiry.readAt ?? new Date();

    const [updated] = await this.db
      .update(businessInquiries)
      .set({
        status: inquiry.status === 'pending' ? 'read' : inquiry.status,
        readAt: now,
        updatedAt: new Date(),
      })
      .where(eq(businessInquiries.id, id))
      .returning({ id: businessInquiries.id });

    if (!updated) throw new NotFoundException('Business inquiry not found');
    return this.findInquiryForReceiver(id, ownerId);
  }

  async reply(
    id: string,
    ownerId: string,
    dto: ReplyBusinessInquiryDto,
  ): Promise<BusinessInquiryRecord> {
    const inquiry = await this.findInquiryForReceiver(id, ownerId);
    const now = new Date();
    const [updated] = await this.db
      .update(businessInquiries)
      .set({
        status: 'replied',
        readAt: inquiry.readAt ?? now,
        replyMessage: dto.message,
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(businessInquiries.id, id))
      .returning({ id: businessInquiries.id });

    if (!updated) throw new NotFoundException('Business inquiry not found');
    return this.findInquiryForReceiver(id, ownerId);
  }

  private buildInquiryQuery(where: SQL) {
    return this.db
      .select(inquiryRecordColumns)
      .from(businessInquiries)
      .innerJoin(businessDirectories, eq(businessInquiries.businessId, businessDirectories.id))
      .where(where);
  }

  private async findInquiries(
    where: SQL,
    query: QueryBusinessInquiriesDto,
  ): Promise<PaginatedResponse<BusinessInquiryRecord>> {
    const [results, countResult] = await Promise.all([
      this.buildInquiryQuery(where)
        .orderBy(desc(businessInquiries.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(businessInquiries)
        .innerJoin(businessDirectories, eq(businessInquiries.businessId, businessDirectories.id))
        .where(where),
    ]);

    return paginate(results, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  private async findInquiryForReceiver(
    id: string,
    receiverId: string,
  ): Promise<BusinessInquiryRecord> {
    const [inquiryRecord] = await this.buildInquiryQuery(
      andRequired(
        eq(businessInquiries.id, id),
        eq(businessInquiries.receiverId, receiverId),
        isNull(businessDirectories.deletedAt),
      ),
    ).limit(1);

    if (!inquiryRecord) {
      throw new NotFoundException('Business inquiry not found');
    }

    return inquiryRecord;
  }
}
