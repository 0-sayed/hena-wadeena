import { CurrentUser, KycVerifiedGuard, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { InvestmentOpportunitiesService } from '../investment-opportunities/investment-opportunities.service';

import { CreateApplicationDto } from './dto/create-application.dto';
import { DocumentUploadDto } from './dto/document-upload.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { InvestmentApplicationsService } from './investment-applications.service';

@Controller()
export class InvestmentApplicationsController {
  constructor(
    private readonly applicationsService: InvestmentApplicationsService,
    private readonly opportunitiesService: InvestmentOpportunitiesService,
  ) {}

  // --- EOI routes (under /investments prefix) ---

  @Post('investments/:id/interest')
  @Roles(UserRole.INVESTOR, UserRole.MERCHANT)
  @UseGuards(KycVerifiedGuard)
  submitInterest(
    @Param('id') opportunityId: string,
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.applicationsService.submitInterest(opportunityId, user.sub, dto);
  }

  @Get('investments/mine/interests')
  findMyInterests(@Query() query: QueryApplicationsDto, @CurrentUser() user: JwtPayload) {
    return this.applicationsService.findByInvestor(user.sub, query);
  }

  @Get('investments/:id/interests')
  @Roles(UserRole.ADMIN)
  findByOpportunity(@Param('id') opportunityId: string, @Query() query: QueryApplicationsDto) {
    return this.applicationsService.findByOpportunity(opportunityId, query);
  }

  @Patch('investments/:id/interest/withdraw')
  withdraw(@Param('id') opportunityId: string, @CurrentUser() user: JwtPayload) {
    return this.applicationsService.withdraw(opportunityId, user.sub);
  }

  // --- Document upload ---

  @Post('investments/:id/documents')
  @Roles(UserRole.INVESTOR, UserRole.MERCHANT)
  @UseGuards(KycVerifiedGuard)
  uploadDocument(
    @Param('id') opportunityId: string,
    @Body() dto: DocumentUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.applicationsService.generateDocUploadUrl(opportunityId, user.sub, dto);
  }

  // --- Admin routes ---

  @Get('admin/investment/interests')
  @Roles(UserRole.ADMIN)
  findAllAdmin(@Query() query: QueryApplicationsDto) {
    return this.applicationsService.findAllAdmin(query);
  }

  @Patch('admin/investment/interests/:id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.applicationsService.updateStatus(id, dto);
  }

  @Patch('admin/investments/:id/approve')
  @Roles(UserRole.ADMIN)
  approveOpportunity(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.approve(id, user.sub);
  }

  @Patch('admin/investments/:id/feature')
  @Roles(UserRole.ADMIN)
  toggleFeatured(@Param('id') id: string) {
    return this.opportunitiesService.toggleFeatured(id);
  }
}
