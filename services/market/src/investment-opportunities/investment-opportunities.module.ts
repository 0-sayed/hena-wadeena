import { Module } from '@nestjs/common';

import { InvestmentOpportunitiesController } from './investment-opportunities.controller';
import { InvestmentOpportunitiesService } from './investment-opportunities.service';

@Module({
  controllers: [InvestmentOpportunitiesController],
  providers: [InvestmentOpportunitiesService],
  exports: [InvestmentOpportunitiesService],
})
export class InvestmentOpportunitiesModule {}
