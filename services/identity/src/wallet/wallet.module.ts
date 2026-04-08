import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { BookingWalletEventsConsumer } from './booking-wallet-events.consumer';
import { WalletInternalController } from './wallet-internal.controller';
import { WalletService } from './wallet.service';

@Module({
  controllers: [WalletInternalController],
  providers: [WalletService, RedisStreamsService, BookingWalletEventsConsumer],
  exports: [WalletService],
})
export class WalletModule {}
