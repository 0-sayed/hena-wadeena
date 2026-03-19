import { Module } from '@nestjs/common';

import { AdminAttractionsController } from './admin-attractions.controller';
import { AttractionsController } from './attractions.controller';
import { AttractionsService } from './attractions.service';

@Module({
  controllers: [AttractionsController, AdminAttractionsController],
  providers: [AttractionsService],
  exports: [AttractionsService],
})
export class AttractionsModule {}
