import {
  DrizzleModule,
  HealthModule,
  JwtAuthGuard,
  LoggerModule,
  RedisModule,
  REDIS_PREFIX,
  RolesGuard,
  S3Module,
  validateEnv,
} from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuthModule } from './auth/auth.module';
import { ListingsModule } from './listings/listings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot('Market'),
    DrizzleModule.forRoot({
      connectionString: process.env.DATABASE_URL!,
      schema: process.env.DB_SCHEMA ?? 'market',
    }),
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      keyPrefix: REDIS_PREFIX.MARKET,
    }),
    S3Module.forRoot({
      bucket: process.env.AWS_S3_BUCKET ?? '',
      region: process.env.AWS_REGION ?? 'me-south-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      defaultExpiry: 300,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    HealthModule,
    AuthModule,
    ListingsModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
