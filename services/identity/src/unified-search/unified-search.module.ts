import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { SearchModule } from '../search/search.module';

import { UnifiedSearchController } from './unified-search.controller';
import { UnifiedSearchService } from './unified-search.service';

@Module({
  imports: [HttpModule, SearchModule],
  controllers: [UnifiedSearchController],
  providers: [UnifiedSearchService],
})
export class UnifiedSearchModule {}
