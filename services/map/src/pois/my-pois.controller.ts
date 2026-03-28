import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';

import { CreatePoiDto } from './dto';
import { PoisService } from './pois.service';

@Controller('map/pois')
export class MyPoisController {
  constructor(@Inject(PoisService) private readonly poisService: PoisService) {}

  @Post()
  @Roles(UserRole.RESIDENT, UserRole.GUIDE, UserRole.MERCHANT)
  @HttpCode(HttpStatus.CREATED)
  suggest(@Body() dto: CreatePoiDto, @CurrentUser() user: JwtPayload) {
    return this.poisService.create(dto, user.sub);
  }
}
