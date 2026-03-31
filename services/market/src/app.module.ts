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

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BusinessDirectoryModule } from './business-directory/business-directory.module';
import { CommodityPricesModule } from './commodity-prices/commodity-prices.module';
import { InvestmentApplicationsModule } from './investment-applications/investment-applications.module';
import { InvestmentOpportunitiesModule } from './investment-opportunities/investment-opportunities.module';
import { ListingsModule } from './listings/listings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { StatsModule } from './stats/stats.module';

/** Fail fast on missing env var in production; allow empty fallback in dev. */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${key} is required for the market service`);
    }
    return '';
  }
  return value;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot('Market'),
    DrizzleModule.forRoot({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- validateEnv guarantees DATABASE_URL
      connectionString: process.env.DATABASE_URL!,
      schema: process.env.DB_SCHEMA ?? 'market',
    }),
    RedisModule.forRoot({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      keyPrefix: REDIS_PREFIX.MARKET,
    }),
    S3Module.forRoot({
      bucket: requireEnv('AWS_S3_BUCKET'),
      region: process.env.AWS_REGION ?? 'me-south-1',
      accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
      defaultExpiry: 300,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    HealthModule,
    AuthModule,
    AdminModule,
    ListingsModule,
    CommodityPricesModule,
    BusinessDirectoryModule,
    InvestmentOpportunitiesModule,
    InvestmentApplicationsModule,
    ReviewsModule,
    SearchModule,
    StatsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
