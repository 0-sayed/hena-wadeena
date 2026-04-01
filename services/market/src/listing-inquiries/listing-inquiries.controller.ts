import type { JwtPayload } from '@hena-wadeena/nest-common';
import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreateListingInquiryDto } from './dto/create-listing-inquiry.dto';
import { QueryListingInquiriesDto } from './dto/query-listing-inquiries.dto';
import { ReplyListingInquiryDto } from './dto/reply-listing-inquiry.dto';
import { ListingInquiriesService } from './listing-inquiries.service';

@Controller()
export class ListingInquiriesController {
  constructor(
    @Inject(ListingInquiriesService)
    private readonly listingInquiriesService: ListingInquiriesService,
  ) {}

  @Post('listings/:id/inquiries')
  submit(
    @Param('id', ParseUUIDPipe) listingId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateListingInquiryDto,
  ) {
    return this.listingInquiriesService.submit(listingId, user.sub, dto);
  }

  @Get('listing-inquiries/mine/received')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  findReceived(@CurrentUser() user: JwtPayload, @Query() query: QueryListingInquiriesDto) {
    return this.listingInquiriesService.findReceived(user.sub, query);
  }

  @Get('listing-inquiries/mine/sent')
  findSent(@CurrentUser() user: JwtPayload, @Query() query: QueryListingInquiriesDto) {
    return this.listingInquiriesService.findSent(user.sub, query);
  }

  @Patch('listing-inquiries/:id/read')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.listingInquiriesService.markRead(id, user.sub);
  }

  @Patch('listing-inquiries/:id/reply')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.RESIDENT, UserRole.ADMIN)
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReplyListingInquiryDto,
  ) {
    return this.listingInquiriesService.reply(id, user.sub, dto);
  }
}
