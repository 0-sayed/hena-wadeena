import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import { vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';

export const TEST_JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-32-chars-minimum-here';

export interface E2eContext {
  app: INestApplication;
  jwtService: JwtService;
  db: PostgresJsDatabase;
  redis: Redis;
}

export async function createE2eApp(): Promise<E2eContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(EmailService)
    .useValue({ sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined) })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  await app.init();

  const jwtService = new JwtService({ secret: TEST_JWT_SECRET });
  const db = app.get<PostgresJsDatabase>(DRIZZLE_CLIENT);
  const redis = app.get<Redis>(REDIS_CLIENT);

  return { app, jwtService, db, redis };
}
