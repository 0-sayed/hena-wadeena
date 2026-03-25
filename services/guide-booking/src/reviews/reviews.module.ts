import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, RedisStreamsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
