import { DRIZZLE_CLIENT, paginate, RedisStreamsService } from '@hena-wadeena/nest-common';
import { EVENTS, NotificationType } from '@hena-wadeena/types';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { auditEventTypeEnum, kycDocTypeEnum, kycStatusEnum } from '../db/enums';
import * as schema from '../db/schema';
import { auditEvents } from '../db/schema/audit-events';
import { userKyc } from '../db/schema/user-kyc';
import { users } from '../db/schema/users';
import { NotificationsService } from '../notifications/notifications.service';

import type { KycQueryDto } from './dto/kyc-query.dto';
import type { ReviewKycDto } from './dto/review-kyc.dto';
import type { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async submit(userId: string, dto: SubmitKycDto) {
    try {
      const [submission] = await this.db
        .insert(userKyc)
        .values({
          userId,
          docType: dto.docType as (typeof kycDocTypeEnum.enumValues)[number],
          docUrl: dto.docUrl,
        })
        .returning();

      await this.recordAudit(userId, 'kyc_submitted', { docType: dto.docType });
      return submission;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('idx_kyc_unique_pending')) {
        throw new ConflictException('A pending submission for this document type already exists');
      }
      throw err;
    }
  }

  async findByUser(userId: string) {
    return this.db
      .select()
      .from(userKyc)
      .where(eq(userKyc.userId, userId))
      .orderBy(asc(userKyc.createdAt));
  }

  async findPending(query: KycQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const statusValue = query.status as (typeof kycStatusEnum.enumValues)[number];
    const whereClause = eq(userKyc.status, statusValue);

    const [data, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(userKyc)
        .where(whereClause)
        .orderBy(asc(userKyc.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(userKyc).where(whereClause),
    ]);

    return paginate(data, totalRow?.count ?? 0, offset, query.limit);
  }

  async review(id: string, adminId: string, dto: ReviewKycDto) {
    const [updated] = await this.db
      .update(userKyc)
      .set({
        status: dto.status as (typeof kycStatusEnum.enumValues)[number],
        reviewedBy: adminId,
        reviewedAt: sql`now()`,
        rejectionReason: dto.rejectionReason ?? null,
        updatedAt: sql`now()`,
      })
      .where(and(eq(userKyc.id, id), eq(userKyc.status, 'pending')))
      .returning();

    if (!updated) {
      // Distinguish "not found" from "already reviewed"
      const [exists] = await this.db
        .select({ id: userKyc.id })
        .from(userKyc)
        .where(eq(userKyc.id, id))
        .limit(1);
      if (!exists) throw new NotFoundException('KYC submission not found');
      throw new ConflictException('KYC submission is not pending review or was already reviewed');
    }

    if (dto.status === 'approved') {
      await Promise.all([
        this.db
          .update(users)
          .set({ verifiedAt: sql`now()` })
          .where(eq(users.id, updated.userId)),
        this.redisStreams.publish(EVENTS.USER_VERIFIED, {
          userId: updated.userId,
          kycId: id,
          docType: updated.docType,
        }),
        this.notificationsService.create({
          userId: updated.userId,
          type: NotificationType.KYC_APPROVED,
          titleAr: 'تم اعتماد وثائقك',
          titleEn: 'Documents Approved',
          bodyAr: 'تم اعتماد وثائق التحقق الخاصة بك بنجاح',
          bodyEn: 'Your verification documents have been approved',
          data: { kycId: id, docType: updated.docType },
        }),
        this.recordAudit(adminId, 'kyc_approved', { kycId: id, userId: updated.userId }),
      ]);
    } else {
      await Promise.all([
        this.notificationsService.create({
          userId: updated.userId,
          type: NotificationType.KYC_REJECTED,
          titleAr: 'تم رفض وثائقك',
          titleEn: 'Documents Rejected',
          bodyAr: `تم رفض وثائق التحقق: ${dto.rejectionReason}`,
          bodyEn: `Verification documents rejected: ${dto.rejectionReason}`,
          data: { kycId: id, docType: updated.docType, reason: dto.rejectionReason },
        }),
        this.recordAudit(adminId, 'kyc_rejected', {
          kycId: id,
          userId: updated.userId,
          reason: dto.rejectionReason,
        }),
      ]);
    }

    return updated;
  }

  async findByIdOrThrow(id: string) {
    const [kyc] = await this.db.select().from(userKyc).where(eq(userKyc.id, id)).limit(1);
    if (!kyc) throw new NotFoundException('KYC submission not found');
    return kyc;
  }

  private async recordAudit(
    userId: string,
    eventType: (typeof auditEventTypeEnum.enumValues)[number],
    metadata?: Record<string, unknown>,
  ) {
    await this.db.insert(auditEvents).values({
      userId,
      eventType,
      metadata: metadata ?? null,
    });
  }
}
