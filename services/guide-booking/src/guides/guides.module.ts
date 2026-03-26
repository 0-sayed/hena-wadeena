import { Module } from '@nestjs/common';

import { ReviewsModule } from '../reviews/reviews.module';

import { AdminGuidesController } from './admin-guides.controller';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { MyGuideController } from './my-guide.controller';

@Module({
  imports: [ReviewsModule],
  controllers: [GuidesController, MyGuideController, AdminGuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
