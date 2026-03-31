import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';

import { PoiFiltersDto } from './dto';
import { PoisService } from './pois.service';

@Roles(UserRole.ADMIN)
@Controller('map/admin/pois')
export class AdminPoisController {
  constructor(@Inject(PoisService) private readonly poisService: PoisService) {}

  @Get()
  findAll(@Query() filters: PoiFiltersDto) {
    return this.poisService.findAll(filters);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.poisService.approve(id, user.sub);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.poisService.reject(id);
  }
}
