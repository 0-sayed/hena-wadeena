import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import type { ServiceSearchResponse } from '@hena-wadeena/types';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@Controller('internal/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @UseGuards(InternalGuard)
  @Get()
  async search(@Query() query: SearchQueryDto): Promise<ServiceSearchResponse> {
    return this.searchService.search(query);
  }
}
