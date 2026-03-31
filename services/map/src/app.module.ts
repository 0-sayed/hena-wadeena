import {
  DrizzleModule,
  getJwtConfig,
  HealthModule,
  JwtAuthGuard,
  LoggerModule,
  REDIS_PREFIX,
  RedisModule,
  RolesGuard,
} from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { StringValue } from 'ms';
import { ZodValidationPipe } from 'nestjs-zod';

import { JwtStrategy } from './auth/jwt.strategy';
import { CarpoolModule } from './carpool/carpool.module';
import { validateMapEnv } from './config/env.config';
import { PoisModule } from './pois/pois.module';
import { SearchModule } from './search/search.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateMapEnv }),
    LoggerModule.forRoot('Map'),
    DrizzleModule.forRoot({
      connectionString: process.env.DATABASE_URL ?? '',
      schema: process.env.DB_SCHEMA ?? 'map, public',
    }),
    PassportModule,
    JwtModule.register(
      getJwtConfig(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- validated by validateMapEnv
        process.env.JWT_ACCESS_SECRET!,
        (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as StringValue,
      ),
    ),
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      keyPrefix: REDIS_PREFIX.MAP,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    HealthModule,
    PoisModule,
    CarpoolModule,
    StatsModule,
    SearchModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
