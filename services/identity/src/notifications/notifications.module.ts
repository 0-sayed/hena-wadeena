import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { NotificationsEventsConsumer } from './notifications-events.consumer';
import { NotificationsInternalController } from './notifications-internal.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController, NotificationsInternalController],
  providers: [NotificationsService, RedisStreamsService, NotificationsEventsConsumer],
  exports: [NotificationsService],
})
export class NotificationsModule {}
