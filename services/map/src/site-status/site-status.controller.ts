import { CurrentUser, Public } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { CreateStatusDto } from './dto';
import { SiteStatusService } from './site-status.service';

@Controller('map/pois')
export class SiteStatusController {
  constructor(@Inject(SiteStatusService) private readonly siteStatusService: SiteStatusService) {}

  @Public()
  @Get(':id/status')
  getLatestStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.siteStatusService.getLatestStatus(id);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.CREATED)
  postStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.siteStatusService.postStatus(id, user.sub, user.role as UserRole, dto);
  }
}
