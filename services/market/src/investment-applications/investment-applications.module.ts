import { Module } from '@nestjs/common';

import { InvestmentOpportunitiesModule } from '../investment-opportunities/investment-opportunities.module';

import { InvestmentApplicationsController } from './investment-applications.controller';
import { InvestmentApplicationsService } from './investment-applications.service';

@Module({
  imports: [InvestmentOpportunitiesModule],
  controllers: [InvestmentApplicationsController],
  providers: [InvestmentApplicationsService],
})
export class InvestmentApplicationsModule {}
