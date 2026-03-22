import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { ReviewsModule } from '../reviews/reviews.module';

import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [ReviewsModule],
  controllers: [ListingsController],
  providers: [ListingsService, RedisStreamsService],
  exports: [ListingsService],
})
export class ListingsModule {}
