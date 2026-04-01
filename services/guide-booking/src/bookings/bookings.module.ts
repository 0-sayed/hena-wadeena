import { Module } from '@nestjs/common';

import { GuidesModule } from '../guides/guides.module';

import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { MyBookingsController } from './my-bookings.controller';

@Module({
  imports: [GuidesModule],
  controllers: [MyBookingsController, BookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
