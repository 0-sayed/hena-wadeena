import { Public } from '@hena-wadeena/nest-common';
import type { UnifiedSearchResponse } from '@hena-wadeena/types';
import { Controller, Get, Query } from '@nestjs/common';

import { UnifiedSearchQueryDto } from './dto/unified-search-query.dto';
import { UnifiedSearchService } from './unified-search.service';

@Controller('search')
export class UnifiedSearchController {
  constructor(private readonly unifiedSearchService: UnifiedSearchService) {}

  @Public()
  @Get()
  async search(@Query() query: UnifiedSearchQueryDto): Promise<UnifiedSearchResponse> {
    return this.unifiedSearchService.search(query);
  }
}
