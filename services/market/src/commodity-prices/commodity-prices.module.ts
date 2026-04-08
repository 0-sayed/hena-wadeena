import { Module } from '@nestjs/common';

import { PriceAlertsModule } from '../price-alerts/price-alerts.module';

import {
  CommoditiesController,
  CommodityPricesAdminController,
  PriceIndexController,
} from './commodity-prices.controller';
import { CommodityPricesService } from './commodity-prices.service';

@Module({
  imports: [PriceAlertsModule],
  controllers: [CommoditiesController, CommodityPricesAdminController, PriceIndexController],
  providers: [CommodityPricesService],
})
export class CommodityPricesModule {}
