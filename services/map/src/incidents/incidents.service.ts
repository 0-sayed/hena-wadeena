import { DRIZZLE_CLIENT, generateId } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { IncidentStatus } from '@hena-wadeena/types';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { environmentalIncidents } from '../db/schema/index';
import { makePoint } from '../utils/postgis';

import type { CreateIncidentDto } from './dto/create-incident.dto';
import type { IncidentFiltersDto } from './dto/incident-filters.dto';
import type { UpdateIncidentDto } from './dto/update-incident.dto';

type Incident = typeof environmentalIncidents.$inferSelect;

@Injectable()
export class IncidentsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async create(reporterId: string, dto: CreateIncidentDto): Promise<Incident> {
    const [row] = await this.db
      .insert(environmentalIncidents)
      .values({
        id: generateId(),
        reporterId,
        incidentType: dto.incidentType,
        status: IncidentStatus.REPORTED,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        location: makePoint(dto.longitude, dto.latitude),
        photos: dto.photos ?? [],
      })
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to create incident');
    return row;
  }

  async findOne(id: string): Promise<Incident> {
    const [row] = await this.db
      .select()
      .from(environmentalIncidents)
      .where(eq(environmentalIncidents.id, id));

    if (!row) throw new NotFoundException('Incident not found');
    return row;
  }

  async findAll(filters: IncidentFiltersDto): Promise<PaginatedResponse<Incident>> {
    return this.paginate(filters);
  }

  async findMyIncidents(
    reporterId: string,
    filters: IncidentFiltersDto,
  ): Promise<PaginatedResponse<Incident>> {
    return this.paginate(filters, reporterId);
  }

  private async paginate(
    filters: IncidentFiltersDto,
    reporterId?: string,
  ): Promise<PaginatedResponse<Incident>> {
    const where = this.buildWhereClause(filters, reporterId);
    const offset = (filters.page - 1) * filters.limit;

    const [data, countRows] = await Promise.all([
      this.db
        .select()
        .from(environmentalIncidents)
        .where(where)
        .orderBy(desc(environmentalIncidents.createdAt))
        .limit(filters.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(environmentalIncidents).where(where),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data,
      total,
      page: filters.page,
      limit: filters.limit,
      hasMore: offset + filters.limit < total,
    };
  }

  async update(id: string, adminId: string, dto: UpdateIncidentDto): Promise<Incident> {
    const isTerminal =
      dto.status === IncidentStatus.RESOLVED || dto.status === IncidentStatus.DISMISSED;
    const shouldClearResolved = dto.status != null && !isTerminal;

    const setPayload: Partial<typeof environmentalIncidents.$inferInsert> & {
      resolvedAt?: Date | null;
      resolvedBy?: string | null;
    } = {
      status: dto.status,
      adminNotes: dto.adminNotes === '' ? null : dto.adminNotes,
      eeaaReference: dto.eeaaReference === '' ? null : dto.eeaaReference,
      updatedAt: new Date(),
      ...(isTerminal && {
        resolvedAt: new Date(),
        resolvedBy: adminId,
      }),
      ...(shouldClearResolved && {
        resolvedAt: null,
        resolvedBy: null,
      }),
    };

    const [row] = await this.db
      .update(environmentalIncidents)
      .set(setPayload)
      .where(eq(environmentalIncidents.id, id))
      .returning();

    if (!row) throw new NotFoundException('Incident not found');
    return row;
  }

  private buildWhereClause(filters: IncidentFiltersDto, reporterId?: string) {
    const conditions = [];

    if (reporterId != null) {
      conditions.push(eq(environmentalIncidents.reporterId, reporterId));
    }

    if (filters.status != null) {
      conditions.push(eq(environmentalIncidents.status, filters.status));
    }

    if (filters.incidentType != null) {
      conditions.push(eq(environmentalIncidents.incidentType, filters.incidentType));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
