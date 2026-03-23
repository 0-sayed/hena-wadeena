import { Module } from '@nestjs/common';

import { BusinessDirectoryController } from './business-directory.controller';
import { BusinessDirectoryService } from './business-directory.service';

@Module({
  controllers: [BusinessDirectoryController],
  providers: [BusinessDirectoryService],
})
export class BusinessDirectoryModule {}
