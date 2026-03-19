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

  beforeEach(() => {
    const mockConfig = {
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          RESEND_API_KEY: 'test-key',
          EMAIL_FROM: 'test@henawadeena.com',
          FRONTEND_URL: 'http://localhost:8080',
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    service = new EmailService(mockConfig);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send password reset OTP email', async () => {
    await expect(service.sendPasswordResetOtp('user@example.com', '123456')).resolves.not.toThrow();
  });
});
