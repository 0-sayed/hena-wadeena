import { CurrentUser, type JwtPayload, Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';

import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycService } from './kyc.service';

@Controller('users/kyc')
export class KycController {
  constructor(@Inject(KycService) private readonly kycService: KycService) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.INVESTOR, UserRole.GUIDE, UserRole.MERCHANT, UserRole.DRIVER)
  submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(user.sub, dto);
  }

  @Get()
  findOwn(@CurrentUser() user: JwtPayload) {
    return this.kycService.findByUser(user.sub);
  }
}
