import { DRIZZLE_CLIENT, S3Service, generateId } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { investmentApplications } from '../db/schema/investment-applications';
import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { InvestmentOpportunitiesService } from '../investment-opportunities/investment-opportunities.service';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import { CreateApplicationDto } from './dto/create-application.dto';
import { DocumentUploadDto } from './dto/document-upload.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

type Application = typeof investmentApplications.$inferSelect;

/** Valid admin state transitions: current -> allowed next states */
const ADMIN_TRANSITIONS: Record<string, string[]> = {
  pending: ['reviewed'],
  reviewed: ['accepted', 'rejected'],
};

/** States from which an investor can withdraw */
const WITHDRAWABLE_STATES = ['pending', 'reviewed'];

@Injectable()
export class InvestmentApplicationsService {
  private readonly logger = new Logger(InvestmentApplicationsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly s3: S3Service,
    private readonly opportunitiesService: InvestmentOpportunitiesService,
  ) {}

  // --- Private helpers ---

  private async findByOpportunityAndInvestor(
    opportunityId: string,
    investorId: string,
  ): Promise<Application | null> {
    const [app] = await this.db
      .select()
      .from(investmentApplications)
      .where(
        and(
          eq(investmentApplications.opportunityId, opportunityId),
          eq(investmentApplications.investorId, investorId),
        ),
      )
      .limit(1);
    return app ?? null;
  }

  private async findById(id: string): Promise<Application | null> {
    const [app] = await this.db
      .select()
      .from(investmentApplications)
      .where(eq(investmentApplications.id, id))
      .limit(1);
    return app ?? null;
  }

  // --- Public methods ---

  async submitInterest(
    opportunityId: string,
    investorId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    // Validate opportunity exists and is active
    const opp = await this.opportunitiesService.findById(opportunityId);
    if (!opp) throw new NotFoundException('Opportunity not found');
    if (opp.status !== 'active') {
      throw new ConflictException('Can only express interest in active opportunities');
    }

    // Check for duplicate (DB unique constraint is backup, but we give a better error message)
    const existing = await this.findByOpportunityAndInvestor(opportunityId, investorId);
    if (existing) {
      throw new ConflictException('ALREADY_EXPRESSED_INTEREST');
    }

    const application = firstOrThrow(
      await this.db
        .insert(investmentApplications)
        .values({
          opportunityId,
          investorId,
          message: dto.message,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          amountProposed: dto.amountProposed,
          status: 'pending',
        })
        .returning(),
    );

    // Increment denormalized interest count (fire-and-forget)
    void this.db
      .update(investmentOpportunities)
      .set({ interestCount: sql`${investmentOpportunities.interestCount} + 1` })
      .where(eq(investmentOpportunities.id, opportunityId))
      .then(
        () => undefined,
        (err: unknown) => {
          this.logger.error('Failed to increment interest count', err);
        },
      );

    return application;
  }

  async withdraw(opportunityId: string, investorId: string): Promise<Application> {
    const app = await this.findByOpportunityAndInvestor(opportunityId, investorId);
    if (!app) throw new NotFoundException('Application not found');
    if (!WITHDRAWABLE_STATES.includes(app.status)) {
      throw new ConflictException(`Cannot withdraw from ${app.status} status`);
    }

    const [updated] = await this.db
      .update(investmentApplications)
      .set({ status: 'withdrawn' })
      .where(eq(investmentApplications.id, app.id))
      .returning();

    if (!updated) throw new NotFoundException('Application not found');
    return updated;
  }

  async updateStatus(id: string, dto: UpdateApplicationStatusDto): Promise<Application> {
    const app = await this.findById(id);
    if (!app) throw new NotFoundException('Application not found');

    const allowed = ADMIN_TRANSITIONS[app.status];
    if (!allowed?.includes(dto.status)) {
      throw new ConflictException(`Invalid transition: ${app.status} -> ${dto.status}`);
    }

    const [updated] = await this.db
      .update(investmentApplications)
      .set({ status: dto.status as Application['status'] })
      .where(eq(investmentApplications.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Application not found');
    return updated;
  }

  async findByOpportunity(
    opportunityId: string,
    query: QueryApplicationsDto,
  ): Promise<PaginatedResponse<Application>> {
    const conditions = [eq(investmentApplications.opportunityId, opportunityId)];
    if (query.status !== undefined) {
      conditions.push(eq(investmentApplications.status, query.status as Application['status']));
    }

    const where = andRequired(...conditions);

    const [results, countResult] = await Promise.all([
      this.db
        .select()
        .from(investmentApplications)
        .where(where)
        .orderBy(desc(investmentApplications.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentApplications)
        .where(where),
    ]);

    return paginate(results, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async findByInvestor(
    investorId: string,
    query: QueryApplicationsDto,
  ): Promise<PaginatedResponse<Application>> {
    const conditions = [eq(investmentApplications.investorId, investorId)];
    if (query.status !== undefined) {
      conditions.push(eq(investmentApplications.status, query.status as Application['status']));
    }

    const where = andRequired(...conditions);

    const [results, countResult] = await Promise.all([
      this.db
        .select()
        .from(investmentApplications)
        .where(where)
        .orderBy(desc(investmentApplications.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentApplications)
        .where(where),
    ]);

    return paginate(results, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async findAllAdmin(query: QueryApplicationsDto): Promise<PaginatedResponse<Application>> {
    const conditions = [];
    if (query.status !== undefined) {
      conditions.push(eq(investmentApplications.status, query.status as Application['status']));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      this.db
        .select()
        .from(investmentApplications)
        .where(where)
        .orderBy(desc(investmentApplications.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(investmentApplications)
        .where(where),
    ]);

    return paginate(results, countResult[0]?.count ?? 0, query.offset, query.limit);
  }

  async generateDocUploadUrl(
    opportunityId: string,
    callerId: string,
    dto: DocumentUploadDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    const opp = await this.opportunitiesService.findById(opportunityId);
    if (!opp) throw new NotFoundException('Opportunity not found');

    // Caller must be owner OR have an accepted application
    if (opp.ownerId !== callerId) {
      const app = await this.findByOpportunityAndInvestor(opportunityId, callerId);
      if (app?.status !== 'accepted') {
        throw new ForbiddenException(
          'Only the opportunity owner or an investor with accepted EOI can upload documents',
        );
      }
    }

    const ext = dto.filename.split('.').pop() ?? 'pdf';
    const key = `investments/${opportunityId}/docs/${generateId()}.${ext}`;

    const { uploadUrl } = await this.s3.getPresignedUploadUrl({
      key,
      contentType: dto.contentType,
      expiresIn: 300,
    });

    return { uploadUrl, key };
  }
}
