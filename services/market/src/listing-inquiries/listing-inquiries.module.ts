import { Module } from '@nestjs/common';

import { ListingInquiriesController } from './listing-inquiries.controller';
import { ListingInquiriesService } from './listing-inquiries.service';

@Module({
  controllers: [ListingInquiriesController],
  providers: [ListingInquiriesService],
  exports: [ListingInquiriesService],
})
export class ListingInquiriesModule {}
