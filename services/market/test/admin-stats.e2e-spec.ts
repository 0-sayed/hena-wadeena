import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { createE2eApp, type E2eContext } from './e2e-helpers';

let ctx: E2eContext;

beforeAll(async () => {
  ctx = await createE2eApp();
});

afterAll(async () => {
  await ctx.app.close();
});

describe('Admin Stats (e2e)', () => {
  it('GET /admin/stats requires authentication', async () => {
    await request(ctx.app.getHttpServer()).get('/api/v1/admin/stats').expect(401);
  });

  it('GET /admin/moderation/queue requires authentication', async () => {
    await request(ctx.app.getHttpServer()).get('/api/v1/admin/moderation/queue').expect(401);
  });
});
