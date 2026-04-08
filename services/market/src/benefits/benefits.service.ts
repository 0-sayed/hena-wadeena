import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { benefitInfo } from '../db/schema/benefit-info';

import { UpdateBenefitDto } from './dto/update-benefit.dto';

@Injectable()
export class BenefitsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async list() {
    return this.db.select().from(benefitInfo).orderBy(asc(benefitInfo.slug));
  }

  async findBySlug(slug: string) {
    const rows = await this.db.select().from(benefitInfo).where(eq(benefitInfo.slug, slug));
    if (!rows[0]) throw new NotFoundException(`Benefit '${slug}' not found`);
    return rows[0];
  }

  async update(slug: string, dto: UpdateBenefitDto) {
    const updates: Partial<typeof benefitInfo.$inferInsert> = { updatedAt: new Date() };
    if (dto.nameAr !== undefined) updates.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) updates.nameEn = dto.nameEn;
    if (dto.ministryAr !== undefined) updates.ministryAr = dto.ministryAr;
    if (dto.documentsAr !== undefined) updates.documentsAr = dto.documentsAr;
    if (dto.officeNameAr !== undefined) updates.officeNameAr = dto.officeNameAr;
    if (dto.officePhone !== undefined) updates.officePhone = dto.officePhone;
    if (dto.officeAddressAr !== undefined) updates.officeAddressAr = dto.officeAddressAr;
    if (dto.enrollmentNotesAr !== undefined) updates.enrollmentNotesAr = dto.enrollmentNotesAr;
    const rows = await this.db
      .update(benefitInfo)
      .set(updates)
      .where(eq(benefitInfo.slug, slug))
      .returning();
    if (!rows[0]) throw new NotFoundException(`Benefit '${slug}' not found`);
    return rows[0];
  }
}
