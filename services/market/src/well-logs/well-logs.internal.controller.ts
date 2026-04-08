import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { WellLogsService } from './well-logs.service';

@Controller('internal/well-logs')
export class WellLogsInternalController {
  constructor(private readonly wellLogsService: WellLogsService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get('areas')
  getAreaSummary() {
    return this.wellLogsService.getAreaSummary();
  }
}
