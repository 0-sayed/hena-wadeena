import { Module } from '@nestjs/common';

import { SessionModule } from '../session/session.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SessionModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
