import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { UsersModule } from '../users/users.module';

import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule, KycModule, UsersModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminModule {}
