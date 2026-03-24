import { Module } from '@nestjs/common';

import { ReviewsModule } from '../reviews/reviews.module';

import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [ReviewsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
