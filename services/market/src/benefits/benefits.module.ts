import { Module } from '@nestjs/common';

import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';

@Module({
  controllers: [BenefitsController],
  providers: [BenefitsService],
})
export class BenefitsModule {}
