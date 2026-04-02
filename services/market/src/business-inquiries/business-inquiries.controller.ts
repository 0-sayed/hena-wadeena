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

import { BusinessInquiriesService } from './business-inquiries.service';
import { CreateBusinessInquiryDto } from './dto/create-business-inquiry.dto';
import { QueryBusinessInquiriesDto } from './dto/query-business-inquiries.dto';
import { ReplyBusinessInquiryDto } from './dto/reply-business-inquiry.dto';

@Controller()
export class BusinessInquiriesController {
  constructor(
    @Inject(BusinessInquiriesService)
    private readonly businessInquiriesService: BusinessInquiriesService,
  ) {}

  @Post('businesses/:id/inquiries')
  submit(
    @Param('id', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBusinessInquiryDto,
  ) {
    return this.businessInquiriesService.submit(businessId, user.sub, dto);
  }

  @Get('business-inquiries/mine/received')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.ADMIN)
  findReceived(@CurrentUser() user: JwtPayload, @Query() query: QueryBusinessInquiriesDto) {
    return this.businessInquiriesService.findReceived(user.sub, query);
  }

  @Get('business-inquiries/mine/sent')
  findSent(@CurrentUser() user: JwtPayload, @Query() query: QueryBusinessInquiriesDto) {
    return this.businessInquiriesService.findSent(user.sub, query);
  }

  @Patch('business-inquiries/:id/read')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.ADMIN)
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.businessInquiriesService.markRead(id, user.sub);
  }

  @Patch('business-inquiries/:id/reply')
  @Roles(UserRole.MERCHANT, UserRole.INVESTOR, UserRole.ADMIN)
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReplyBusinessInquiryDto,
  ) {
    return this.businessInquiriesService.reply(id, user.sub, dto);
  }
}
