import { Module } from '@nestjs/common';

import { WellLogsController } from './well-logs.controller';
import { WellLogsInternalController } from './well-logs.internal.controller';
import { WellLogsService } from './well-logs.service';

@Module({
  controllers: [WellLogsController, WellLogsInternalController],
  providers: [WellLogsService],
})
export class WellLogsModule {}
