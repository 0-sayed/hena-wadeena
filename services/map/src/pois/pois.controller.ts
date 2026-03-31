import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { PoiFiltersDto } from './dto';
import { PoisService } from './pois.service';

@Controller('map/pois')
export class PoisController {
  constructor(@Inject(PoisService) private readonly poisService: PoisService) {}

  @Public()
  @Get()
  findAll(@Query() filters: PoiFiltersDto) {
    filters.status ??= 'approved';
    return this.poisService.findAll(filters);
  }

  @Public()
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.poisService.findById(id);
  }
}
