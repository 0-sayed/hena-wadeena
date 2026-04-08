import { Module } from '@nestjs/common';

import { GuideReviewsController } from './guide-reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [GuideReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
