import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { UsersModule } from '../users/users.module';

import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [AuthModule, KycModule, UsersModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminModule {}
