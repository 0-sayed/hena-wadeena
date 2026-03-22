import { Public } from '@hena-wadeena/nest-common';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { GuideFiltersDto } from './dto';
import { GuidesService } from './guides.service';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

class PaginationDto extends createZodDto(paginationSchema) {}

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Public()
  @Get()
  findAll(@Query() filters: GuideFiltersDto) {
    return this.guidesService.findAll(filters);
  }

  @Public()
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidesService.findById(id);
  }

  @Public()
  @Get(':id/packages')
  findGuidePackages(@Param('id', ParseUUIDPipe) id: string, @Query() query: PaginationDto) {
    return this.guidesService.findGuidePackages(id, query.page, query.limit);
  }
}
