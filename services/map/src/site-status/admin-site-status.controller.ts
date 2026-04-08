import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { GrantStewardDto } from './dto';
import { SiteStatusService } from './site-status.service';

@Roles(UserRole.ADMIN)
@Controller('map/pois')
export class AdminSiteStatusController {
  constructor(@Inject(SiteStatusService) private readonly siteStatusService: SiteStatusService) {}

  @Post(':id/stewards')
  @HttpCode(HttpStatus.CREATED)
  grantSteward(
    @Param('id', ParseUUIDPipe) poiId: string,
    @Body() dto: GrantStewardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.siteStatusService.grantSteward(poiId, dto.userId, user.sub);
  }

  @Delete(':id/stewards/:userId')
  @HttpCode(HttpStatus.OK)
  revokeSteward(
    @Param('id', ParseUUIDPipe) poiId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.siteStatusService.revokeSteward(poiId, userId);
  }
}
