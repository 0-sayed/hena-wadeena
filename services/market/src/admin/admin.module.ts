// services/market/src/admin/admin.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';
import { StatsModule } from '../stats/stats.module';

import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SERVICE_TIMEOUT_MS } from './services.config';

@Module({
  imports: [
    HttpModule.register({
      timeout: SERVICE_TIMEOUT_MS,
      maxRedirects: 0,
    }),
    ListingsModule,
    StatsModule,
  ],
  controllers: [AdminController, AdminStatsController, AdminModerationController],
  providers: [AdminService, AdminStatsService, AdminModerationService],
})
export class AdminModule {}
