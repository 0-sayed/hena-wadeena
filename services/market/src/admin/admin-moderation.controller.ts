import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Controller, Get, Query } from '@nestjs/common';

import { AdminModerationService } from './admin-moderation.service';
import { ModerationQueryDto } from './dto/moderation-query.dto';

@Controller('admin/moderation')
@Roles(UserRole.ADMIN)
export class AdminModerationController {
  constructor(private readonly adminModerationService: AdminModerationService) {}

  @Get('queue')
  getQueue(@Query() query: ModerationQueryDto) {
    return this.adminModerationService.getQueue(query);
  }
}
