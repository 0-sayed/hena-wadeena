import { CurrentUser, OptionalJwt, Public, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { InvestmentOpportunitiesService } from './investment-opportunities.service';

const userRoles = new Set<string>(Object.values(UserRole));

function isUserRole(value: string): value is UserRole {
  return userRoles.has(value);
}

@Controller('investments')
export class InvestmentOpportunitiesController {
  constructor(
    @Inject(InvestmentOpportunitiesService)
    private readonly opportunitiesService: InvestmentOpportunitiesService,
  ) {}

  private async assertOwnerUnlessAdmin(id: string, user: JwtPayload): Promise<void> {
    if (!isUserRole(user.role) || user.role !== UserRole.ADMIN) {
      await this.opportunitiesService.assertOwnership(id, user.sub);
    }
  }

  // --- Public routes (static paths MUST come before /:id) ---

  @Get()
  @Public()
  findAll(@Query() query: QueryOpportunitiesDto) {
    return this.opportunitiesService.findAll(query);
  }

  @Get('sectors')
  @Public()
  findSectorStats() {
    return this.opportunitiesService.findSectorStats();
  }

  @Get('featured')
  @Public()
  findFeatured(@Query() query: QueryOpportunitiesDto) {
    return this.opportunitiesService.findFeatured(query);
  }

  @Get('mine')
  @Roles(UserRole.INVESTOR, UserRole.MERCHANT, UserRole.ADMIN)
  findMine(@CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.findMine(user.sub);
  }

  @Get(':id')
  @Public()
  @OptionalJwt()
  async findById(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    const opportunity = await this.opportunitiesService.findById(id, user?.sub, user?.role);
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  // --- Protected: create ---

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVESTOR, UserRole.MERCHANT)
  create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.create(dto, user.sub);
  }

  // --- Owner routes (admin bypasses ownership check) ---

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.INVESTOR, UserRole.MERCHANT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.assertOwnerUnlessAdmin(id, user);
    return this.opportunitiesService.update(id, dto);
  }

  @Patch(':id/close')
  @Roles(UserRole.ADMIN, UserRole.INVESTOR, UserRole.MERCHANT)
  async close(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.assertOwnerUnlessAdmin(id, user);
    return this.opportunitiesService.close(id);
  }
}
