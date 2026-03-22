import { Module } from '@nestjs/common';

import { AdminGuidesController } from './admin-guides.controller';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { MyGuideController } from './my-guide.controller';

@Module({
  controllers: [GuidesController, MyGuideController, AdminGuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
