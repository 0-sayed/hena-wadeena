import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { BusinessDirectoryController } from './business-directory.controller';
import { BusinessDirectoryService } from './business-directory.service';

@Module({
  controllers: [BusinessDirectoryController],
  providers: [BusinessDirectoryService, RedisStreamsService],
})
export class BusinessDirectoryModule {}
