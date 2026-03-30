import { Public } from '@hena-wadeena/nest-common';
import type { UnifiedSearchResponse } from '@hena-wadeena/types';
import { Controller, Get, Inject, Query } from '@nestjs/common';

import { UnifiedSearchQueryDto } from './dto/unified-search-query.dto';
import { UnifiedSearchService } from './unified-search.service';

@Controller('search')
export class UnifiedSearchController {
  constructor(
    @Inject(UnifiedSearchService) private readonly unifiedSearchService: UnifiedSearchService,
  ) {}

  @Public()
  @Get()
  async search(@Query() query: UnifiedSearchQueryDto): Promise<UnifiedSearchResponse> {
    return this.unifiedSearchService.search(query);
  }
}
