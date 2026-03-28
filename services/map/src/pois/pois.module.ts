import { Module } from '@nestjs/common';

import { AdminPoisController } from './admin-pois.controller';
import { MyPoisController } from './my-pois.controller';
import { PoisController } from './pois.controller';
import { PoisService } from './pois.service';

@Module({
  controllers: [PoisController, AdminPoisController, MyPoisController],
  providers: [PoisService],
  exports: [PoisService],
})
export class PoisModule {}
