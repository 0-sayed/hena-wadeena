import { Module } from '@nestjs/common';

import { DesertTripsOverdueCron } from './desert-trips-overdue.cron';
import { DesertTripsController } from './desert-trips.controller';
import { DesertTripsService } from './desert-trips.service';

@Module({
  controllers: [DesertTripsController],
  providers: [DesertTripsService, DesertTripsOverdueCron],
})
export class DesertTripsModule {}
