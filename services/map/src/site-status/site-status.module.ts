import { Module } from '@nestjs/common';

import { AdminSiteStatusController } from './admin-site-status.controller';
import { SiteStatusController } from './site-status.controller';
import { SiteStatusService } from './site-status.service';
import { StatusBoardController } from './status-board.controller';

@Module({
  controllers: [SiteStatusController, StatusBoardController, AdminSiteStatusController],
  providers: [SiteStatusService],
  exports: [SiteStatusService],
})
export class SiteStatusModule {}
