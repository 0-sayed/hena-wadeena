import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let testUserId: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Disable throttling — test suite exceeds per-route limits within a single 60s window
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      // Mock email — Resend SDK fails with placeholder API key in tests
      .overrideProvider(EmailService)
      .useValue({ sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    // Don't use configureApp — it calls app.listen() which conflicts with supertest.
    // Manually apply the prefix and pipes that configureApp would set.
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          full_name: 'E2E Test User',
          role: 'tourist',
        })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.token_type).toBe('bearer');
      expect(res.body.expires_in).toBe(900);
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('tourist');

      accessToken = res.body.access_token as string;
      refreshToken = res.body.refresh_token as string;
      testUserId = res.body.user.id as string;
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          full_name: 'Duplicate',
        })
        .expect(409);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'another@example.com',
          password: 'short',
          full_name: 'Test',
        })
        .expect(400); // nestjs-zod returns 400 by default (M1 fix)
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      accessToken = res.body.access_token as string;
      refreshToken = res.body.refresh_token as string;
    });

    it('should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'anything' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testEmail);
      expect(res.body.fullName).toBe('E2E Test User');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('should update profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ display_name: 'Updated Name', language: 'en' })
        .expect(200);

      expect(res.body.displayName).toBe('Updated Name');
      expect(res.body.language).toBe('en');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue new token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      // Old refresh token should now be revoked
      accessToken = res.body.access_token as string;
      refreshToken = res.body.refresh_token as string;
    });

    it('should reject reused refresh token (reuse detection)', async () => {
      // Save current token before refreshing (C4 fix: use actual old refresh token)
      const oldRefreshToken = refreshToken;

      // Refresh to get new tokens (old token is now revoked)
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);
      accessToken = res.body.access_token as string;
      refreshToken = res.body.refresh_token as string;

      // Now reuse the OLD (revoked) refresh token — should trigger reuse detection
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(401);

      // After reuse detection, the entire family is revoked,
      // so even the NEW token should also be invalid now
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);

      // Re-login to get fresh tokens for remaining tests
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);
      accessToken = loginRes.body.access_token as string;
      refreshToken = loginRes.body.refresh_token as string;
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    const newPassword = 'newpassword456';

    it('should change password and return new tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ current_password: testPassword, new_password: newPassword })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      accessToken = res.body.access_token as string;
      refreshToken = res.body.refresh_token as string;
    });

    it('should login with new password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: newPassword })
        .expect(200);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout and blacklist token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({}) // ZodValidationPipe requires an object body even when all fields are optional
        .expect(200);
    });

    it('should reject blacklisted token on /me', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/password-reset/request', () => {
    it('should accept reset request (202)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email: testEmail })
        .expect(202);
    });

    it('should return 202 for non-existent email (no enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(202);
    });
  });

  describe('GET /api/v1/internal/users/:id (cross-service)', () => {
    it('should return public user profile', async () => {
      // Use userId captured at registration — avoids exhausting rate-limited login endpoint
      const res = await request(app.getHttpServer())
        .get(`/api/v1/internal/users/${testUserId}`)
        .expect(200);

      expect(res.body.id).toBe(testUserId);
      expect(res.body.full_name).toBeDefined();
      expect(res.body.role).toBeDefined();
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });
});
