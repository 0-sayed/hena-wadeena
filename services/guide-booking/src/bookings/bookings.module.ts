import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { GuidesModule } from '../guides/guides.module';

import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { MyBookingsController } from './my-bookings.controller';

@Module({
  imports: [GuidesModule],
  controllers: [MyBookingsController, BookingsController, AdminBookingsController],
  providers: [BookingsService, RedisStreamsService],
  exports: [BookingsService],
})
export class BookingsModule {}
