import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { PackageFiltersDto } from './dto';
import { TourPackagesService } from './tour-packages.service';

@Controller('packages')
export class TourPackagesController {
  constructor(private readonly tourPackagesService: TourPackagesService) {}

  @Public()
  @Get()
  findAll(@Query() filters: PackageFiltersDto) {
    return this.tourPackagesService.findAll(filters);
  }

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tourPackagesService.findById(id);
  }
}
