import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';

import { PoisService } from './pois.service';

@Roles(UserRole.ADMIN)
@Controller('map/pois')
export class AdminPoisController {
  constructor(@Inject(PoisService) private readonly poisService: PoisService) {}

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
