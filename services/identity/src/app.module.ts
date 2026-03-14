import {
  DrizzleModule,
  HealthModule,
  JwtAuthGuard,
  LoggerModule,
  RedisModule,
  REDIS_PREFIX,
  RolesGuard,
  validateEnv,
} from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot('Identity'),
    DrizzleModule.forRoot({
      connectionString: process.env.DATABASE_URL!,
      schema: process.env.DB_SCHEMA ?? 'identity',
    }),
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      keyPrefix: REDIS_PREFIX.IDENTITY,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
