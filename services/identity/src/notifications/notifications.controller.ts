import { CurrentUser, type JwtPayload } from '@hena-wadeena/nest-common';
import { Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common';

import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findAllForUser(user.sub, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.notificationsService.markRead(id, user.sub);
    return { success: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return { success: true };
  }
}
