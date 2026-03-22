import { CurrentUser, type JwtPayload, Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { KycQueryDto } from './dto/kyc-query.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { KycService } from './kyc.service';

@Controller('admin/kyc')
@Roles(UserRole.ADMIN)
export class KycAdminController {
  constructor(@Inject(KycService) private readonly kycService: KycService) {}

  @Get()
  findAll(@Query() query: KycQueryDto) {
    return this.kycService.findPending(query);
  }

  @Patch(':id')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.review(id, user.sub, dto);
  }
}
