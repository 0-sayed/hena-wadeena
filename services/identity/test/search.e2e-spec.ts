import { generateId } from '@hena-wadeena/nest-common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { users } from '../src/db/schema/users';

import { createE2eApp, type E2eContext } from './e2e-helpers';

process.env.INTERNAL_SECRET ??= 'test-internal-secret';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

describe('Identity Internal Search (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await ctx.redis.flushdb();
    await ctx.db.delete(users);
  });

  async function seedUser(overrides: {
    fullName: string;
    role: 'guide' | 'merchant' | 'driver' | 'tourist';
    displayName?: string;
  }) {
    const [row] = await ctx.db
      .insert(users)
      .values({
        id: generateId(),
        email: `${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        fullName: overrides.fullName,
        displayName: overrides.displayName ?? null,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
        role: overrides.role,
        status: 'active',
      })
      .returning();
    return row!;
  }

  describe('GET /api/v1/internal/search', () => {
    it('returns 403 without X-Internal-Secret header', async () => {
      await request(ctx.app.getHttpServer()).get('/api/v1/internal/search?q=test').expect(403);
    });

    it('returns 400 when q is missing', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(400);
    });

    it('finds a guide by Arabic full name', async () => {
      await seedUser({ fullName: 'أحمد محمد', role: 'guide' });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=أحمد')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('user');
      expect(res.body.data[0].title.ar).toBe('أحمد محمد');
      expect(res.body.data[0].metadata.role).toBe('guide');
    });

    it('normalizes diacritics (tashkeel) in search', async () => {
      await seedUser({ fullName: 'فندق الواحات', role: 'merchant' });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=فُنْدُق')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('normalizes alef variants', async () => {
      await seedUser({ fullName: 'إبراهيم', role: 'driver' });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=ابراهيم')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('matches Arabic word prefixes', async () => {
      await seedUser({ fullName: 'فندق الواحات', role: 'merchant' });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=فن')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title.ar).toContain('فندق');
    });

    it('excludes users with non-public roles (tourist)', async () => {
      await seedUser({ fullName: 'سائح تجريبي', role: 'tourist' });
      await seedUser({ fullName: 'سائح مرشد', role: 'guide' });

      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=سائح')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].metadata.role).toBe('guide');
    });

    it('returns empty results for no matches', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=nonexistent')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.hasMore).toBe(false);
    });

    it('respects limit and offset pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await seedUser({ fullName: `مرشد سياحي ${i}`, role: 'guide' });
      }

      const page1 = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=مرشد&limit=2&offset=0')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.hasMore).toBe(true);

      const page2 = await request(ctx.app.getHttpServer())
        .get('/api/v1/internal/search?q=مرشد&limit=2&offset=2')
        .set('x-internal-secret', INTERNAL_SECRET)
        .expect(200);

      expect(page2.body.data).toHaveLength(2);

      const ids1 = page1.body.data.map((r: { id: string }) => r.id);
      const ids2 = page2.body.data.map((r: { id: string }) => r.id);
      expect(ids1).not.toEqual(expect.arrayContaining(ids2));
    });
  });
});
