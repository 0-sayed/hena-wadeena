import { Module } from '@nestjs/common';

import { BusinessInquiriesController } from './business-inquiries.controller';
import { BusinessInquiriesService } from './business-inquiries.service';

@Module({
  controllers: [BusinessInquiriesController],
  providers: [BusinessInquiriesService],
  exports: [BusinessInquiriesService],
})
export class BusinessInquiriesModule {}
