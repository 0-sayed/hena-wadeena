import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';

import { AppModule } from '../src/app.module';

export const TEST_JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-32-chars-minimum-here';

export const ADMIN_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000011';
export const RESIDENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000012';
export const GUIDE_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000013';
export const DRIVER_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000014';
export const TOURIST_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000015';

export interface E2eContext {
  app: INestApplication;
  jwtService: JwtService;
  db: PostgresJsDatabase;
  redis: Redis;
}

/** Creates and initializes the NestJS app for E2E tests with standard overrides. */
export async function createE2eApp(): Promise<E2eContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  await app.init();

  const jwtService = new JwtService({ secret: TEST_JWT_SECRET });
  const db = app.get<PostgresJsDatabase>(DRIZZLE_CLIENT);
  const redis = app.get<Redis>(REDIS_CLIENT);

  return { app, jwtService, db, redis };
}

/** Creates a JWT Bearer token for E2E tests. Thread-safe via closure counter. */
export function createTokenFactory(jwtService: JwtService) {
  let jtiSeq = 0;

  function makeToken(sub: string, role: string): string {
    const jti = `test-jti-${++jtiSeq}`;
    return `Bearer ${jwtService.sign({ sub, role, email: `${role}@test.com`, lang: 'ar', jti })}`;
  }

  return {
    makeToken,
    adminToken: () => makeToken(ADMIN_ID, UserRole.ADMIN),
    residentToken: () => makeToken(RESIDENT_ID, UserRole.RESIDENT),
    guideToken: () => makeToken(GUIDE_ID, UserRole.GUIDE),
    driverToken: () => makeToken(DRIVER_ID, UserRole.DRIVER),
    touristToken: () => makeToken(TOURIST_ID, UserRole.TOURIST),
  };
}
