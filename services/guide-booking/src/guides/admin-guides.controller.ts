import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { GuideFiltersDto } from './dto';
import { GuidesService } from './guides.service';

const adminGuideFiltersSchema = z.object({
  status: z.enum(['active', 'inactive', 'deleted', 'unverified']).optional(),
});

class AdminGuideFiltersDto extends createZodDto(adminGuideFiltersSchema) {}

const verifyBodySchema = z.object({
  verified: z.boolean(),
});

class VerifyBodyDto extends createZodDto(verifyBodySchema) {}

const etaaVerifyBodySchema = z.object({
  verified: z.boolean(),
});

class EtaaVerifyBodyDto extends createZodDto(etaaVerifyBodySchema) {}

const setStatusBodySchema = z.object({
  active: z.boolean(),
});

class SetStatusBodyDto extends createZodDto(setStatusBodySchema) {}

@Roles(UserRole.ADMIN)
@Controller('admin/guides')
export class AdminGuidesController {
  constructor(@Inject(GuidesService) private readonly guidesService: GuidesService) {}

  @Get()
  adminFindAll(@Query() filters: GuideFiltersDto, @Query() adminFilters: AdminGuideFiltersDto) {
    return this.guidesService.adminFindAll(filters, adminFilters.status);
  }

  @Patch(':id/verify')
  adminVerify(@Param('id') id: string, @Body() dto: VerifyBodyDto) {
    return this.guidesService.adminVerify(id, dto.verified);
  }

  @Patch(':id/etaa-verify')
  adminEtaaVerify(@Param('id') id: string, @Body() dto: EtaaVerifyBodyDto) {
    return this.guidesService.adminEtaaVerify(id, dto.verified);
  }

  @Patch(':id/status')
  adminSetStatus(@Param('id') id: string, @Body() dto: SetStatusBodyDto) {
    return this.guidesService.adminSetStatus(id, dto.active);
  }
}
