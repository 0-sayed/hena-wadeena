import { ConfigService } from '@nestjs/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EmailService } from './email.service';

const mockSend = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
);

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

describe('EmailService', () => {
  let service: EmailService;

  function createConfig(overrides: Record<string, string | undefined> = {}) {
    return {
      get: vi.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string | undefined> = {
          NODE_ENV: 'test',
          RESEND_API_KEY: 'test-key',
          EMAIL_FROM: 'test@henawadeena.com',
          FRONTEND_URL: 'http://localhost:8080',
          ...overrides,
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    service = new EmailService(createConfig());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send password reset OTP email', async () => {
    await expect(service.sendPasswordResetOtp('user@example.com', '123456')).resolves.not.toThrow();
  });

  it('should send password changed confirmation email', async () => {
    await expect(service.sendPasswordChangedConfirmation('user@example.com')).resolves.not.toThrow();
  });

  it('should send password reset confirmation email', async () => {
    await expect(service.sendPasswordResetConfirmation('user@example.com')).resolves.not.toThrow();
  });

  it('allows missing Resend credentials outside production', () => {
    expect(() => new EmailService(createConfig({ RESEND_API_KEY: undefined }))).not.toThrow();
  });

  it('throws when RESEND_API_KEY is missing in production', () => {
    expect(() =>
      new EmailService(createConfig({ NODE_ENV: 'production', RESEND_API_KEY: undefined })),
    ).toThrow('RESEND_API_KEY is required in production');
  });
});
