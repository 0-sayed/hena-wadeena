import { CurrentUser, OptionalJwt, Public } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { CarpoolService } from './carpool.service';
import { RideFiltersDto } from './dto';

@Controller('carpool')
export class CarpoolController {
  constructor(@Inject(CarpoolService) private readonly carpoolService: CarpoolService) {}

  @Public()
  @Get()
  findAll(@Query() filters: RideFiltersDto) {
    return this.carpoolService.findAll(filters);
  }

  @OptionalJwt()
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    return this.carpoolService.findById(id, user?.sub);
  }
}
