import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';
import type { SearchResponse } from './types';

@Controller('internal/search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
