import { Module } from '@nestjs/common';

import { CarpoolController } from './carpool.controller';
import { CarpoolService } from './carpool.service';
import { MyCarpoolController } from './my-carpool.controller';

@Module({
  controllers: [CarpoolController, MyCarpoolController],
  providers: [CarpoolService],
  exports: [CarpoolService],
})
export class CarpoolModule {}
