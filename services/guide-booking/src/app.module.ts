import {
  DrizzleModule,
  getJwtConfig,
  HealthModule,
  JwtAuthGuard,
  LoggerModule,
  REDIS_PREFIX,
  RedisModule,
  RolesGuard,
  S3Module,
  validateEnv,
} from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { StringValue } from 'ms';
import { ZodValidationPipe } from 'nestjs-zod';

import { AttractionsModule } from './attractions/attractions.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { BookingsModule } from './bookings/bookings.module';
import { GuidesModule } from './guides/guides.module';
import { TourPackagesModule } from './tour-packages/tour-packages.module';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${name} environment variable is required`);
    }
    console.warn(`⚠️  ${name} is not set — S3 uploads will fail at runtime`);
    return '';
  }
  return value;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot('GuideBooking'),
    DrizzleModule.forRoot({
      connectionString: requireEnv('DATABASE_URL'),
      schema: process.env.DB_SCHEMA ?? 'guide_booking, public',
    }),
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
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      keyPrefix: REDIS_PREFIX.GUIDE_BOOKING,
    }),
    S3Module.forRoot({
      region: process.env.AWS_REGION ?? 'me-south-1',
      accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
      bucket: requireEnv('AWS_S3_BUCKET'),
      defaultExpiry: Number(process.env.AWS_S3_PRESIGNED_URL_EXPIRES ?? 3600),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    HealthModule,
    AttractionsModule,
    GuidesModule,
    TourPackagesModule,
    BookingsModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
