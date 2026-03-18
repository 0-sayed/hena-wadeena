import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, RedisStreamsService],
  exports: [ListingsService],
})
export class ListingsModule {}
