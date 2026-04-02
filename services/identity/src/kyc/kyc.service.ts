import { DRIZZLE_CLIENT, paginate, RedisStreamsService } from '@hena-wadeena/nest-common';
import {
  EVENTS,
  KycDocType,
  NotificationType,
  UserStatus,
  getRequiredKycDocuments,
} from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { alias } from 'drizzle-orm/pg-core';

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
  private readonly reviewers = alias(users, 'reviewers');

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async submit(userId: string, dto: SubmitKycDto) {
    const [user] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const requiredDocuments = getRequiredKycDocuments(user.role);
    if (!requiredDocuments.includes(dto.docType as (typeof kycDocTypeEnum.enumValues)[number])) {
      throw new BadRequestException('This document type is not required for the user role');
    }

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

  async findAll(query: KycQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const statusValue = query.status as ((typeof kycStatusEnum.enumValues)[number] | undefined);
    const dataQuery = this.db
      .select({
        id: userKyc.id,
        userId: userKyc.userId,
        fullName: users.fullName,
        documentType: userKyc.docType,
        documentUrl: userKyc.docUrl,
        status: userKyc.status,
        submittedAt: userKyc.createdAt,
        reviewedAt: userKyc.reviewedAt,
        reviewedBy: userKyc.reviewedBy,
        reviewedByName: this.reviewers.fullName,
        notes: userKyc.rejectionReason,
      })
      .from(userKyc)
      .innerJoin(users, eq(userKyc.userId, users.id))
      .leftJoin(this.reviewers, eq(userKyc.reviewedBy, this.reviewers.id));
    const countQuery = this.db
      .select({ count: count() })
      .from(userKyc)
      .innerJoin(users, eq(userKyc.userId, users.id));

    const [rawData, [totalRow]] = await Promise.all([
      (statusValue ? dataQuery.where(eq(userKyc.status, statusValue)) : dataQuery)
        .orderBy(asc(userKyc.createdAt))
        .limit(query.limit)
        .offset(offset),
      statusValue ? countQuery.where(eq(userKyc.status, statusValue)) : countQuery,
    ]);

    return paginate(rawData, totalRow?.count ?? 0, offset, query.limit);
  }

  async review(id: string, adminId: string, dto: ReviewKycDto) {
    const { updated, activated } = await this.db.transaction(async (tx) => {
      const [row] = await tx
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

      if (!row) {
        const [exists] = await tx
          .select({ id: userKyc.id })
          .from(userKyc)
          .where(eq(userKyc.id, id))
          .limit(1);
        if (!exists) throw new NotFoundException('KYC submission not found');
        throw new ConflictException('KYC submission is not pending review or was already reviewed');
      }

      let userActivated = false;
      if (dto.status === 'approved') {
        const [user] = await tx
          .select({ role: users.role, status: users.status })
          .from(users)
          .where(eq(users.id, row.userId))
          .limit(1);
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const requiredDocuments = getRequiredKycDocuments(user.role);
        const submissions = await tx
          .select({
            docType: userKyc.docType,
            status: userKyc.status,
          })
          .from(userKyc)
          .where(eq(userKyc.userId, row.userId))
          .orderBy(asc(userKyc.createdAt));

        const approvedDocuments = new Set<KycDocType>(
          submissions
            .filter((submission) => submission.status === 'approved')
            .map((submission) => submission.docType as KycDocType),
        );

        userActivated = requiredDocuments.every((docType) => approvedDocuments.has(docType));

        if (userActivated && user.status !== 'active') {
          await tx
            .update(users)
            .set({
              status: UserStatus.ACTIVE,
              verifiedAt: sql`now()`,
              updatedAt: sql`now()`,
            })
            .where(eq(users.id, row.userId));
        }
      }

      await tx.insert(auditEvents).values({
        userId: adminId,
        eventType: dto.status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
        metadata:
          dto.status === 'approved'
            ? { kycId: id, userId: row.userId }
            : { kycId: id, userId: row.userId, reason: dto.rejectionReason },
      });

      return { updated: row, activated: userActivated };
    });

    if (dto.status === 'approved' && activated) {
      await Promise.all([
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
          bodyAr: 'تم اعتماد وثائق التحقق الخاصة بك وتفعيل الحساب بنجاح',
          bodyEn: 'Your verification documents were approved and your account is now active',
          data: { kycId: id, docType: updated.docType },
        }),
      ]);
    } else if (dto.status === 'rejected') {
      await this.notificationsService.create({
        userId: updated.userId,
        type: NotificationType.KYC_REJECTED,
        titleAr: 'تم رفض وثائقك',
        titleEn: 'Documents Rejected',
        bodyAr: `تم رفض وثائق التحقق: ${dto.rejectionReason}`,
        bodyEn: `Verification documents rejected: ${dto.rejectionReason}`,
        data: { kycId: id, docType: updated.docType, reason: dto.rejectionReason },
      });
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
