import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { UserRole } from '@hena-wadeena/types';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { pointsOfInterest, siteStatusUpdates, siteStewards } from '../db/schema/index';
import { isUniqueViolation } from '../utils/db';

import type { CreateStatusDto } from './dto';

// Correlated scalar subquery to get the latest value of a column from site_status_updates for a POI.
// Uses correlated subqueries (not LATERAL) to stay compatible with the mock chain in tests.
const latestStatusField = (col: Column) => sql`(
  SELECT ${col} FROM ${siteStatusUpdates}
  WHERE ${siteStatusUpdates.poiId} = ${pointsOfInterest.id}
  ORDER BY ${siteStatusUpdates.createdAt} DESC LIMIT 1
)`;

type StatusUpdate = typeof siteStatusUpdates.$inferSelect;
type Steward = typeof siteStewards.$inferSelect;

export interface PoiWithStatus {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  location: unknown;
  status: string | null;
  statusNoteAr: string | null;
  statusNoteEn: string | null;
  validUntil: Date | null;
  statusUpdatedAt: Date | null;
}

@Injectable()
export class SiteStatusService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async getLatestStatus(poiId: string): Promise<StatusUpdate | null> {
    await this.assertPoiApproved(poiId);

    const [row] = await this.db
      .select()
      .from(siteStatusUpdates)
      .where(eq(siteStatusUpdates.poiId, poiId))
      .orderBy(sql`${siteStatusUpdates.createdAt} DESC`)
      .limit(1);

    return row ?? null;
  }

  async postStatus(
    poiId: string,
    userId: string,
    userRole: UserRole,
    dto: CreateStatusDto,
  ): Promise<StatusUpdate> {
    await this.assertPoiApproved(poiId);

    if (userRole !== UserRole.ADMIN) {
      await this.assertIsSteward(poiId, userId);
    }

    const [row] = await this.db
      .insert(siteStatusUpdates)
      .values({
        poiId,
        stewardId: userId,
        status: dto.status,
        noteAr: dto.noteAr ?? null,
        noteEn: dto.noteEn ?? null,
        validUntil: dto.validUntil ?? null,
      })
      .returning();

    if (!row) throw new Error('Insert did not return a row');
    return row;
  }

  async getStatusBoard(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<PoiWithStatus>> {
    const offset = (params.page - 1) * params.limit;

    const latestCreatedAt = latestStatusField(siteStatusUpdates.createdAt);
    const statusSq = latestStatusField(siteStatusUpdates.status);
    const noteArSq = latestStatusField(siteStatusUpdates.noteAr);
    const noteEnSq = latestStatusField(siteStatusUpdates.noteEn);
    const validUntilSq = latestStatusField(siteStatusUpdates.validUntil);

    const where = and(eq(pointsOfInterest.status, 'approved'), isNull(pointsOfInterest.deletedAt));

    const [data, countRows] = await Promise.all([
      this.db
        .select({
          id: pointsOfInterest.id,
          nameAr: pointsOfInterest.nameAr,
          nameEn: pointsOfInterest.nameEn,
          category: pointsOfInterest.category,
          location: pointsOfInterest.location,
          status: statusSq,
          statusNoteAr: noteArSq,
          statusNoteEn: noteEnSq,
          validUntil: validUntilSq,
          statusUpdatedAt: latestCreatedAt,
        })
        .from(pointsOfInterest)
        .where(where)
        .orderBy(sql`${pointsOfInterest.createdAt} DESC`)
        .limit(params.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(pointsOfInterest).where(where),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data: data as PoiWithStatus[],
      total,
      page: params.page,
      limit: params.limit,
      hasMore: offset + params.limit < total,
    };
  }

  async grantSteward(poiId: string, userId: string, adminId: string): Promise<Steward> {
    await this.assertPoiApproved(poiId);

    try {
      const [row] = await this.db
        .insert(siteStewards)
        .values({ poiId, userId, grantedBy: adminId })
        .returning();

      if (!row) throw new Error('Insert did not return a row');
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('User is already a steward for this site');
      }
      throw err;
    }
  }

  async revokeSteward(poiId: string, userId: string): Promise<void> {
    const [deleted] = await this.db
      .delete(siteStewards)
      .where(and(eq(siteStewards.poiId, poiId), eq(siteStewards.userId, userId)))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Steward grant not found');
    }
  }

  private async assertPoiExists(poiId: string): Promise<void> {
    const [poi] = await this.db
      .select({ id: pointsOfInterest.id })
      .from(pointsOfInterest)
      .where(and(eq(pointsOfInterest.id, poiId), isNull(pointsOfInterest.deletedAt)))
      .limit(1);

    if (!poi) throw new NotFoundException('POI not found');
  }

  private async assertPoiApproved(poiId: string): Promise<void> {
    const [poi] = await this.db
      .select({ id: pointsOfInterest.id })
      .from(pointsOfInterest)
      .where(
        and(
          eq(pointsOfInterest.id, poiId),
          eq(pointsOfInterest.status, 'approved'),
          isNull(pointsOfInterest.deletedAt),
        ),
      )
      .limit(1);

    if (!poi) throw new NotFoundException('POI not found');
  }

  private async assertIsSteward(poiId: string, userId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: siteStewards.id })
      .from(siteStewards)
      .where(and(eq(siteStewards.poiId, poiId), eq(siteStewards.userId, userId)))
      .limit(1);

    if (!row) {
      throw new ForbiddenException('Not a steward for this site');
    }
  }
}
