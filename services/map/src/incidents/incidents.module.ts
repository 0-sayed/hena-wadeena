import { Module } from '@nestjs/common';

import { AdminIncidentsController } from './admin-incidents.controller';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  controllers: [IncidentsController, AdminIncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
