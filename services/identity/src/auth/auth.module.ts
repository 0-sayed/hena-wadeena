import { getJwtConfig } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { EmailModule } from '../email/email.module';
import { KycModule } from '../kyc/kyc.module';
import { SessionModule } from '../session/session.module';
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- validated by validateEnv
          config.get<string>('JWT_ACCESS_SECRET')!,
          config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as StringValue,
        ),
      inject: [ConfigService],
    }),
    UsersModule,
    EmailModule,
    SessionModule,
    KycModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, HashingService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
