import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';

import { NotificationsEventsConsumer } from './notifications-events.consumer';
import { NotificationsInternalController } from './notifications-internal.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [UsersModule],
  controllers: [NotificationsController, NotificationsInternalController],
  providers: [NotificationsService, RedisStreamsService, NotificationsEventsConsumer],
  exports: [NotificationsService],
})
export class NotificationsModule {}
