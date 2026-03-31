import { DRIZZLE_CLIENT, InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { userKyc } from '../db/schema/user-kyc';
import { users } from '../db/schema/users';

@Controller('internal/moderation')
export class ModerationController {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async getPendingItems() {
    const pendingKyc = await this.db
      .select({
        id: userKyc.id,
        userId: userKyc.userId,
        userName: users.fullName,
        userEmail: users.email,
        docType: userKyc.docType,
        docUrl: userKyc.docUrl,
        status: userKyc.status,
        createdAt: userKyc.createdAt,
      })
      .from(userKyc)
      .innerJoin(users, eq(userKyc.userId, users.id))
      .where(eq(userKyc.status, 'pending'))
      .orderBy(userKyc.createdAt);

    return {
      data: pendingKyc.map((item) => ({
        id: item.id,
        type: 'kyc' as const,
        title: item.userName,
        description: `${item.docType} verification`,
        status: item.status,
        createdAt: item.createdAt,
        createdBy: {
          id: item.userId,
          name: item.userName,
          email: item.userEmail,
        },
      })),
    };
  }
}
