import { Public, Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';

import { BenefitsService } from './benefits.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
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

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateBenefitDto) {
    return this.service.create(dto);
  }

  @Put(':slug')
  @Roles(UserRole.ADMIN)
  update(@Param('slug') slug: string, @Body() dto: UpdateBenefitDto) {
    return this.service.update(slug, dto);
  }

  @Delete(':slug')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(@Param('slug') slug: string) {
    return this.service.delete(slug);
  }
}
