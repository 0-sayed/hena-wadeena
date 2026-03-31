// services/market/src/admin/admin.controller.ts
import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { ListingsService } from '../listings/listings.service';

import { AdminService } from './admin.service';
import { FeatureListingDto } from './dto/feature-listing.dto';
import { QueryAdminListingsDto } from './dto/query-admin-listings.dto';
import { VerifyListingDto } from './dto/verify-listing.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(ListingsService) private readonly listingsService: ListingsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('listings')
  getListings(@Query() query: QueryAdminListingsDto) {
    return this.listingsService.findAllAdmin(query);
  }

  @Patch('listings/:id/verify')
  verifyListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyListingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listingsService.verify(id, dto, user.sub);
  }

  @Patch('listings/:id/feature')
  featureListing(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FeatureListingDto) {
    return this.listingsService.setFeatured(id, dto);
  }

  @Get('moderation/queue')
  getModerationQueue() {
    return this.adminService.getModerationQueue();
  }
}
