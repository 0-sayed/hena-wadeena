import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Controller, Get } from '@nestjs/common';

import { AdminStatsService } from './admin-stats.service';

@Controller('admin/stats')
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get()
  getStats() {
    return this.adminStatsService.getAggregatedStats();
  }
}
