import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getJwtConfig, RedisStreamsService } from '@hena-wadeena/nest-common';
import type { StringValue } from 'ms';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) =>
        getJwtConfig(
          config.get<string>('JWT_ACCESS_SECRET')!,
          config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as StringValue,
        ),
      inject: [ConfigService],
    }),
    UsersModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, HashingService, JwtStrategy, RedisStreamsService],
  exports: [AuthService],
})
export class AuthModule {}
