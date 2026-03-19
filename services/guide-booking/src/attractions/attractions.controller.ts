import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { AttractionsService } from './attractions.service';
import { AttractionFiltersDto, NearbyQueryDto } from './dto';

@Controller('attractions')
export class AttractionsController {
  constructor(private readonly attractionsService: AttractionsService) {}

  @Public()
  @Get()
  findAll(@Query() filters: AttractionFiltersDto) {
    return this.attractionsService.findAll(filters);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.attractionsService.findBySlug(slug);
  }

  @Public()
  @Get(':slug/nearby')
  findNearby(@Param('slug') slug: string, @Query() query: NearbyQueryDto) {
    return this.attractionsService.findNearby(slug, query.limit, query.radiusKm);
  }
}
