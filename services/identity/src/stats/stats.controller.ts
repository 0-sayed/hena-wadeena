import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { StatsService } from './stats.service';

@Controller('internal/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  getStats() {
    return this.statsService.getStats();
  }
}
