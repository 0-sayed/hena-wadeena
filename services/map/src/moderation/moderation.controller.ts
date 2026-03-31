import { DRIZZLE_CLIENT, InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { pointsOfInterest } from '../db/schema/points-of-interest';

@Controller('internal/moderation')
export class ModerationController {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async getPendingItems() {
    const pendingPois = await this.db
      .select({
        id: pointsOfInterest.id,
        nameAr: pointsOfInterest.nameAr,
        nameEn: pointsOfInterest.nameEn,
        description: pointsOfInterest.description,
        category: pointsOfInterest.category,
        status: pointsOfInterest.status,
        submittedBy: pointsOfInterest.submittedBy,
        createdAt: pointsOfInterest.createdAt,
      })
      .from(pointsOfInterest)
      .where(eq(pointsOfInterest.status, 'pending'))
      .orderBy(pointsOfInterest.createdAt);

    return {
      data: pendingPois.map((item) => ({
        id: item.id,
        type: 'poi' as const,
        title: item.nameAr,
        description: item.description,
        status: item.status,
        category: item.category,
        createdAt: item.createdAt,
        createdBy: {
          id: item.submittedBy,
          name: null,
          email: null,
        },
      })),
    };
  }
}
