import { Public, Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';

import { BenefitsService } from './benefits.service';
import { UpdateBenefitDto } from './dto/update-benefit.dto';

@Controller('benefits')
export class BenefitsController {
  constructor(private readonly service: BenefitsService) {}

  @Get()
  @Public()
  list() {
    return this.service.list();
  }

  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Put(':slug')
  @Roles(UserRole.ADMIN)
  update(@Param('slug') slug: string, @Body() dto: UpdateBenefitDto) {
    return this.service.update(slug, dto);
  }
}
