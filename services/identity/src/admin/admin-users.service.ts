import { randomBytes } from 'node:crypto';

import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { HashingService } from '../auth/hashing.service';
import * as schema from '../db/schema';
import { auditEvents } from '../db/schema/index';
import { KycService } from '../kyc/kyc.service';
import { UsersService } from '../users/users.service';

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
const MAX_UNBIASED_PASSWORD_BYTE = 256 - (256 % PASSWORD_ALPHABET.length);

function generateRandomPassword(length = 12): string {
  let password = '';

  while (password.length < length) {
    const bytes = randomBytes(length - password.length);

    for (const byte of bytes) {
      if (byte >= MAX_UNBIASED_PASSWORD_BYTE) {
        continue;
      }

      password += PASSWORD_ALPHABET.charAt(byte % PASSWORD_ALPHABET.length);

      if (password.length === length) {
        break;
      }
    }
  }

  return password;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(HashingService) private readonly hashingService: HashingService,
    @Inject(KycService) private readonly kycService: KycService,
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findDetail(id: string) {
    const [user, kycSubmissions, recentAuditEvents] = await Promise.all([
      this.usersService.findByIdOrThrow(id),
      this.kycService.findByUser(id),
      this.db
        .select({
          id: auditEvents.id,
          eventType: auditEvents.eventType,
          metadata: auditEvents.metadata,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(
          or(
            eq(auditEvents.userId, id),
            sql`${auditEvents.metadata}->>'targetUserId' = ${id}`,
          ),
        )
        .orderBy(desc(auditEvents.createdAt))
        .limit(8),
    ]);

    const latestKyc = kycSubmissions.at(-1) ?? null;
    const { passwordHash, deletedAt, searchVector, ...safe } = user;
    void passwordHash;
    void deletedAt;
    void searchVector;

    return {
      ...safe,
      kycStatus: latestKyc?.status ?? null,
      latestKycDocumentType: latestKyc?.docType ?? null,
      kycSubmittedAt: latestKyc?.createdAt ?? null,
      kycReviewedAt: latestKyc?.reviewedAt ?? null,
      recentAuditEvents,
    };
  }

  async resetPassword(id: string, adminId: string) {
    await this.usersService.findByIdOrThrow(id);

    const password = generateRandomPassword();
    const passwordHash = await this.hashingService.hash(password);
    await this.usersService.adminResetPassword(id, adminId, passwordHash);

    return { password };
  }
}
