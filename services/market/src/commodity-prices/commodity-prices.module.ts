import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import {
  CommoditiesController,
  CommodityPricesAdminController,
  PriceIndexController,
} from './commodity-prices.controller';
import { CommodityPricesService } from './commodity-prices.service';

@Module({
  controllers: [CommoditiesController, CommodityPricesAdminController, PriceIndexController],
  providers: [CommodityPricesService, RedisStreamsService],
})
export class CommodityPricesModule {}
