import { DRIZZLE_CLIENT, S3Service, firstOrThrow, generateId } from '@hena-wadeena/nest-common';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { investmentApplications } from '../db/schema/investment-applications';

type Application = typeof investmentApplications.$inferSelect;
type InsertApplication = typeof investmentApplications.$inferInsert;

interface OpportunitiesService {
  findById(id: string): Promise<{ id: string; ownerId: string; status: string } | null>;
}

interface CreateApplicationDto {
  amountProposed?: number;
  message?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface UpdateStatusDto {
  status: Application['status'];
}

interface FileUploadDto {
  filename: string;
  contentType: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['reviewed', 'rejected'],
  reviewed: ['accepted', 'rejected'],
};

const TERMINAL_STATUSES = new Set(['accepted', 'rejected', 'withdrawn']);

@Injectable()
export class InvestmentApplicationsService {
  private readonly logger = new Logger(InvestmentApplicationsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly s3: S3Service,
    private readonly opportunitiesService: OpportunitiesService,
  ) {}

  async submitInterest(
    opportunityId: string,
    investorId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const opportunity = await this.opportunitiesService.findById(opportunityId);
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    if (opportunity.status !== 'active') {
      throw new ConflictException('Opportunity is not accepting applications');
    }

    const application = firstOrThrow(
      await this.db
        .insert(investmentApplications)
        .values({
          id: generateId(),
          opportunityId,
          investorId,
          amountProposed: dto.amountProposed,
          message: dto.message,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          status: 'pending',
        } satisfies InsertApplication)
        .returning(),
    );

    this.logger.log(`Application submitted for opportunity ${opportunityId} by ${investorId}`);
    return application;
  }

  async withdraw(opportunityId: string, investorId: string): Promise<Application> {
    const [existing] = await this.db
      .select()
      .from(investmentApplications)
      .where(
        and(
          eq(investmentApplications.opportunityId, opportunityId),
          eq(investmentApplications.investorId, investorId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Application not found');
    if (existing.status === 'accepted' || existing.status === 'rejected') {
      throw new ConflictException(`Cannot withdraw a ${existing.status} application`);
    }

    return firstOrThrow(
      await this.db
        .update(investmentApplications)
        .set({ status: 'withdrawn' })
        .where(eq(investmentApplications.id, existing.id))
        .returning(),
    );
  }

  async updateStatus(applicationId: string, dto: UpdateStatusDto): Promise<Application> {
    const [existing] = await this.db
      .select()
      .from(investmentApplications)
      .where(eq(investmentApplications.id, applicationId))
      .limit(1);

    if (!existing) throw new NotFoundException('Application not found');

    if (TERMINAL_STATUSES.has(existing.status)) {
      throw new ConflictException(`Cannot transition from terminal status "${existing.status}"`);
    }

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed?.includes(dto.status)) {
      throw new ConflictException(
        `Invalid transition from "${existing.status}" to "${dto.status}"`,
      );
    }

    return firstOrThrow(
      await this.db
        .update(investmentApplications)
        .set({ status: dto.status })
        .where(eq(investmentApplications.id, applicationId))
        .returning(),
    );
  }

  async generateDocUploadUrl(
    opportunityId: string,
    callerId: string,
    fileDto: FileUploadDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    const opportunity = await this.opportunitiesService.findById(opportunityId);
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    if (opportunity.ownerId !== callerId) {
      const [accepted] = await this.db
        .select()
        .from(investmentApplications)
        .where(
          and(
            eq(investmentApplications.opportunityId, opportunityId),
            eq(investmentApplications.investorId, callerId),
            eq(investmentApplications.status, 'accepted'),
          ),
        )
        .limit(1);

      if (!accepted) throw new ForbiddenException('Not authorized to upload documents');
    }

    const key = `investments/${opportunityId}/docs/${generateId()}-${fileDto.filename}`;
    const result = await this.s3.getPresignedUploadUrl({
      key,
      contentType: fileDto.contentType,
    });

    return { uploadUrl: result.uploadUrl, key };
  }
}
