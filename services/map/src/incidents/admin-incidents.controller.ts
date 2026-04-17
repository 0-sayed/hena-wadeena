import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { IncidentFiltersDto, UpdateIncidentDto } from './dto';
import { IncidentsService } from './incidents.service';

@Roles(UserRole.ADMIN)
@Controller('admin/map/environmental-incidents')
export class AdminIncidentsController {
  constructor(@Inject(IncidentsService) private readonly incidentsService: IncidentsService) {}

  @Get()
  findAll(@Query() filters: IncidentFiltersDto) {
    return this.incidentsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentsService.update(id, user.sub, dto);
  }
}
