import { InternalGuard, Public } from '@hena-wadeena/nest-common';
import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('internal/notifications')
export class NotificationsInternalController {
  constructor(
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  @Public()
  @UseGuards(InternalGuard)
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }
}
