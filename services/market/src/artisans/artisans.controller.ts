import { CurrentUser, Public } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ArtisansService } from './artisans.service';
import {
  CreateArtisanProductDto,
  CreateArtisanProfileDto,
  CreateWholesaleInquiryDto,
  QueryArtisansDto,
  QueryProductsDto,
  UpdateArtisanProductDto,
  UpdateArtisanProfileDto,
  UpdateInquiryStatusDto,
} from './dto';

@Controller('artisans')
export class ArtisansController {
  constructor(private readonly artisansService: ArtisansService) {}

  // --- Public routes (static paths before dynamic) ---

  @Get()
  @Public()
  listArtisans(@Query() query: QueryArtisansDto) {
    return this.artisansService.listArtisans(query);
  }

  @Get('profile/me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.artisansService.getMyProfile(user.sub);
  }

  @Post('profile')
  createProfile(@CurrentUser() user: JwtPayload, @Body() dto: CreateArtisanProfileDto) {
    return this.artisansService.createProfile(user.sub, dto);
  }

  @Patch('profile/me')
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateArtisanProfileDto) {
    return this.artisansService.updateMyProfile(user.sub, dto);
  }

  @Get('inquiries')
  listMyInquiries(@CurrentUser() user: JwtPayload) {
    return this.artisansService.listMyInquiries(user.sub);
  }

  @Patch('inquiries/:id')
  updateInquiryStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.artisansService.updateInquiryStatus(user.sub, id, dto);
  }

  @Get('my-products')
  listMyProducts(@CurrentUser() user: JwtPayload, @Query() query: QueryProductsDto) {
    return this.artisansService.listMyProducts(user.sub, query);
  }

  @Post('products')
  createProduct(@CurrentUser() user: JwtPayload, @Body() dto: CreateArtisanProductDto) {
    return this.artisansService.createProduct(user.sub, dto);
  }

  @Get('products/:id')
  @Public()
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.artisansService.getProductForPublic(id);
  }

  @Patch('products/:id')
  updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArtisanProductDto,
  ) {
    return this.artisansService.updateProduct(user.sub, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.artisansService.deleteProduct(user.sub, id);
  }

  @Post('products/:id/inquiries')
  @Public()
  submitInquiry(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateWholesaleInquiryDto) {
    return this.artisansService.submitInquiry(id, dto);
  }

  @Get(':id')
  @Public()
  getArtisan(@Param('id', ParseUUIDPipe) id: string) {
    return this.artisansService.getArtisanById(id);
  }

  @Get(':id/products')
  @Public()
  getArtisanProducts(@Param('id', ParseUUIDPipe) id: string, @Query() query: QueryProductsDto) {
    return this.artisansService.getArtisanProducts(id, query);
  }
}
