import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { StatsModule } from '../stats/stats.module';

import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { SERVICE_TIMEOUT_MS } from './services.config';

@Module({
  imports: [
    HttpModule.register({
      timeout: SERVICE_TIMEOUT_MS,
      maxRedirects: 0,
    }),
    StatsModule,
  ],
  controllers: [AdminStatsController, AdminModerationController],
  providers: [AdminStatsService, AdminModerationService],
})
export class AdminModule {}
