import { Module } from '@nestjs/common';

import { SessionModule } from '../session/session.module';

import { BookingWalletEventsConsumer } from './booking-wallet-events.consumer';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SessionModule],
  controllers: [UsersController],
  providers: [UsersService, BookingWalletEventsConsumer],
  exports: [UsersService],
})
export class UsersModule {}
