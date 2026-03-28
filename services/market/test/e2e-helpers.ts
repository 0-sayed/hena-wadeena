import { DRIZZLE_CLIENT, REDIS_CLIENT, S3Service } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import { vi } from 'vitest';

import { AppModule } from '../src/app.module';

export const TEST_JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-32-chars-minimum-here';

export const ADMIN_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000003';
export const MERCHANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
export const INVESTOR_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000002';
export const TOURIST_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000004';
export const RESIDENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000005';

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
    .overrideProvider(S3Service)
    .useValue({
      getPresignedUploadUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://s3.example.com/test-presigned-url',
        key: 'market/test/test-file.jpg',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }),
    })
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

  function makeToken(sub: string, role: string, opts?: { kycStatus?: string }): string {
    const jti = `test-jti-${++jtiSeq}`;
    return `Bearer ${jwtService.sign({
      sub,
      role,
      email: `${role}@test.com`,
      jti,
      ...(opts?.kycStatus && { kycStatus: opts.kycStatus }),
    })}`;
  }

  return {
    makeToken,
    adminToken: () => makeToken(ADMIN_ID, UserRole.ADMIN),
    merchantToken: (opts?: { kycStatus?: string }) =>
      makeToken(MERCHANT_ID, UserRole.MERCHANT, opts),
    investorToken: (opts?: { kycStatus?: string }) =>
      makeToken(INVESTOR_ID, UserRole.INVESTOR, opts),
    touristToken: () => makeToken(TOURIST_ID, UserRole.TOURIST),
    residentToken: () => makeToken(RESIDENT_ID, UserRole.RESIDENT),
  };
}
