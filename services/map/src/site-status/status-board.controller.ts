import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, Query } from '@nestjs/common';

import { StatusBoardQueryDto } from './dto';
import { SiteStatusService } from './site-status.service';

@Controller('map/sites')
export class StatusBoardController {
  constructor(@Inject(SiteStatusService) private readonly siteStatusService: SiteStatusService) {}

  @Public()
  @Get('status-board')
  getStatusBoard(@Query() query: StatusBoardQueryDto) {
    return this.siteStatusService.getStatusBoard({ page: query.page, limit: query.limit });
  }
}
