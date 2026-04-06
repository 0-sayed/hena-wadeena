import { generateId } from '@hena-wadeena/nest-common';
import type { ServiceSearchResponse } from '@hena-wadeena/types';
import { HttpService } from '@nestjs/axios';
import type { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { users } from '../src/db/schema/users';
import { walletLedger } from '../src/db/schema/wallet-ledger';

import { type E2eContext } from './e2e-helpers';

process.env.INTERNAL_SECRET ??= 'test-internal-secret';

describe('Unified Search (e2e)', () => {
  let ctx: E2eContext;
  let mockHttpService: { get: ReturnType<typeof vi.fn> };

  const marketResponse: ServiceSearchResponse = {
    data: [
      {
        id: generateId(),
        type: 'listing',
        title: { ar: 'فندق الواحات الكبير', en: 'Grand Oasis Hotel' },
        snippet: 'فندق فاخر في الخارجة',
        rank: 0.9,
        metadata: { category: 'hospitality', district: 'الخارجة' },
      },
    ],
    hasMore: false,
    query: 'فندق',
  };

  beforeAll(async () => {
    // We need to override HttpService before creating the app
    // The e2e helper creates the app, so we need a custom setup here
    const { DRIZZLE_CLIENT, REDIS_CLIENT } = await import('@hena-wadeena/nest-common');
    const { Test } = await import('@nestjs/testing');
    const { ThrottlerGuard } = await import('@nestjs/throttler');
    const { JwtService } = await import('@nestjs/jwt');
    const { AppModule } = await import('../src/app.module');
    const { EmailService } = await import('../src/email/email.service');

    mockHttpService = {
      get: vi.fn().mockReturnValue(
        of({
          data: marketResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} },
        } as AxiosResponse<ServiceSearchResponse>),
      ),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(EmailService)
      .useValue({ sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined) })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .compile();

    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();

    const jwtService = new JwtService({
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-32-chars-minimum-here',
    });
    const db = app.get(DRIZZLE_CLIENT);
    const redis = app.get(REDIS_CLIENT);

    ctx = { app, jwtService, db, redis } as E2eContext;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await ctx.redis.flushdb();
    await ctx.db.delete(walletLedger);
    await ctx.db.delete(users);
    mockHttpService.get.mockClear();
    mockHttpService.get.mockReturnValue(
      of({
        data: marketResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} },
      } as AxiosResponse<ServiceSearchResponse>),
    );
  });

  async function seedUser(overrides: { fullName: string; role: 'guide' | 'merchant' }) {
    const [row] = await ctx.db
      .insert(users)
      .values({
        id: generateId(),
        email: `${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        fullName: overrides.fullName,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
        role: overrides.role,
        status: 'active',
      })
      .returning();
    return row!;
  }

  describe('GET /api/v1/search', () => {
    it('returns 400 when q is missing', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/search').expect(400);
    });

    it('returns merged results from Identity and Market', async () => {
      await seedUser({ fullName: 'مرشد فندق', role: 'guide' });

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/search?q=فندق').expect(200);

      expect(res.body.sources).toContain('identity');
      expect(res.body.sources).toContain('market');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const types = res.body.data.map((r: { type: string }) => r.type);
      expect(types).toContain('listing');
    });

    it('filters by type parameter', async () => {
      await seedUser({ fullName: 'مرشد تجريبي', role: 'guide' });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/search?q=مرشد&type=user')
        .expect(200);

      const types = res.body.data.map((r: { type: string }) => r.type);
      expect(types.every((t: string) => t === 'user')).toBe(true);
      // Should not call Market when type=user
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('returns results sorted by rank descending', async () => {
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/search?q=فندق').expect(200);

      const ranks = res.body.data.map((r: { rank: number }) => r.rank);
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
      }
    });

    it('handles downstream service failure gracefully', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Market service unavailable')),
      );
      await seedUser({ fullName: 'مرشد متاح', role: 'guide' });

      const res = await request(ctx.app.getHttpServer()).get('/api/v1/search?q=مرشد').expect(200);

      expect(res.body.sources).toContain('identity');
      expect(res.body.sources).not.toContain('market');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty results when nothing matches', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: { data: [], hasMore: false, query: 'zzz' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} },
        } as AxiosResponse<ServiceSearchResponse>),
      );

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/search?q=zzzznonexistent')
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.hasMore).toBe(false);
    });

    it('is accessible without authentication (@Public)', async () => {
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/search?q=test').expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('sources');
    });
  });
});
