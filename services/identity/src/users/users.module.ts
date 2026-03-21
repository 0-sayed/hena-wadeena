import { RedisStreamsService } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

import { SessionModule } from '../session/session.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SessionModule],
  controllers: [UsersController],
  providers: [UsersService, RedisStreamsService],
  exports: [UsersService],
})
export class UsersModule {}
