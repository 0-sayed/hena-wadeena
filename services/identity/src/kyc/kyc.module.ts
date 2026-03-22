import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';

import { KycAdminController } from './kyc-admin.controller';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [NotificationsModule],
  controllers: [KycController, KycAdminController],
  providers: [KycService, RedisStreamsService],
})
export class KycModule {}
