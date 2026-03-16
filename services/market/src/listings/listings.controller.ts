import { CurrentUser, OptionalJwt, Public, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreateListingDto } from './dto/create-listing.dto';
import { ImageUploadDto, NearbyQueryDto, QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  private async assertOwnerUnlessAdmin(id: string, user: JwtPayload): Promise<void> {
    if ((user.role as UserRole) !== UserRole.ADMIN) {
      await this.listingsService.assertOwnership(id, user.sub);
    }
  }

  // --- Public routes (static paths MUST come before /:id) ---

  @Get()
  @Public()
  findAll(@Query() query: QueryListingsDto) {
    return this.listingsService.findAll(query);
  }

  @Get('featured')
  @Public()
  findFeatured(@Query() query: QueryListingsDto) {
    return this.listingsService.findFeatured(query);
  }

  @Get('nearby')
  @Public()
  findNearby(@Query() query: NearbyQueryDto) {
    return this.listingsService.findNearby(query);
  }

  @Get('slug/:slug')
  @OptionalJwt()
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: JwtPayload) {
    const listing = await this.listingsService.findBySlug(slug, user?.sub);
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  @Get(':id')
  @OptionalJwt()
  async findById(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    const listing = await this.listingsService.findById(id, user?.sub);
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  // --- Protected: create ---

  @Post()
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT)
  create(@Body() dto: CreateListingDto, @CurrentUser() user: JwtPayload) {
    return this.listingsService.create(dto, user.sub);
  }

  // --- Owner routes: update + delete (admin bypasses ownership check) ---

  @Patch(':id')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.assertOwnerUnlessAdmin(id, user);
    return this.listingsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.assertOwnerUnlessAdmin(id, user);
    return this.listingsService.remove(id);
  }

  // --- Image upload (owner or admin) ---

  @Post(':id/images')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  async generateImageUploadUrl(
    @Param('id') id: string,
    @Body() dto: ImageUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.assertOwnerUnlessAdmin(id, user);
    return this.listingsService.generateImageUploadUrl(id, dto);
  }
}
