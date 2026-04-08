import { Module } from '@nestjs/common';

import { SessionModule } from '../session/session.module';
import { WalletModule } from '../wallet/wallet.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SessionModule, WalletModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
