import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EmailService } from '../email/email.service';
import { createMockDb } from '../test-utils/create-mock-db';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';

const mockUser = {
  id: 'user-uuid',
  email: 'test@example.com',
  fullName: 'Test User',
  displayName: null,
  avatarUrl: null,
  passwordHash: '$argon2id$hashed',
  role: 'tourist' as const,
  status: 'active' as const,
  language: 'ar',
  phone: null,
  verifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: UsersService;
  let mockHashingService: HashingService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };

    mockUsersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
      updatePassword: vi.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;

    mockHashingService = {
      hash: vi.fn().mockResolvedValue('$argon2id$hashed'),
      verify: vi.fn().mockResolvedValue(true),
    } as unknown as HashingService;

    const mockEmailService = {
      sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined),
    } as unknown as EmailService;

    const mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
      decode: vi
        .fn()
        .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900, jti: 'mock-jti' }),
    };

    const mockConfigService = {
      get: vi.fn((key: string, defaultVal?: string) => {
        const config: Record<string, string> = {
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key] ?? defaultVal;
      }),
    };

    const mockRedisStreams = {
      publish: vi.fn().mockResolvedValue('mock-stream-id'),
    };

    authService = new AuthService(
      mockUsersService,
      mockHashingService,
      mockEmailService,

      mockJwtService as any,

      mockConfigService as any,

      mockRedisStreams as any,

      mockDb as any,

      mockRedis as any,
    );
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(mockUsersService, 'create').mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        full_name: 'New User',
        role: 'tourist',
      });

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockHashingService.hash).toHaveBeenCalledWith('password123');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'Test',
          role: 'tourist',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.id).toBe('user-uuid');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nope@example.com', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for suspended user', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      });
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(true);

      await expect(
        authService.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should issue new token pair for valid refresh token', async () => {
      const storedToken = {
        id: 'token-id',
        userId: 'user-uuid',
        tokenHash: 'hash',
        family: 'family-uuid',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        deviceInfo: null,
        ipAddress: null,
      };
      mockDb.limit.mockResolvedValueOnce([storedToken]);
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);

      const result = await authService.refresh('valid-refresh-token');
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
    });

    it('should throw on revoked token (reuse detection)', async () => {
      const revokedToken = {
        id: 'token-id',
        userId: 'user-uuid',
        tokenHash: 'hash',
        family: 'family-uuid',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        deviceInfo: null,
        ipAddress: null,
      };
      mockDb.limit.mockResolvedValueOnce([revokedToken]);

      await expect(authService.refresh('reused-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on expired refresh token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: 'user-uuid',
        tokenHash: 'hash',
        family: 'family-uuid',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        deviceInfo: null,
        ipAddress: null,
      };
      mockDb.limit.mockResolvedValueOnce([expiredToken]);

      await expect(authService.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on non-existent token', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(authService.refresh('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should blacklist access token in Redis and revoke refresh tokens', async () => {
      await authService.logout({
        sub: 'user-uuid',
        email: 'test@example.com',
        role: 'tourist',
        jti: 'mock-jti',
        exp: Math.floor(Date.now() / 1000) + 900,
      });
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password and return new tokens', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(true);
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-token-id' }]);

      const result = await authService.changePassword('user-uuid', 'oldpass', 'newpass123');
      expect(result.access_token).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUsersService.updatePassword).toHaveBeenCalled();
    });

    it('should throw on wrong current password', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(false);

      await expect(authService.changePassword('user-uuid', 'wrong', 'newpass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send OTP email for existing user', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(mockUser);

      const emailSpy = vi.spyOn(authService['emailService'], 'sendPasswordResetOtp');
      mockDb.returning.mockResolvedValueOnce([{ id: 'otp-id' }]);

      await authService.requestPasswordReset('test@example.com');
      expect(emailSpy).toHaveBeenCalled();
    });

    it('should silently succeed for non-existent email (prevent enumeration)', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(null);

      await expect(authService.requestPasswordReset('nope@example.com')).resolves.not.toThrow();
    });
  });

  describe('confirmPasswordReset', () => {
    it('should reset password with valid OTP', async () => {
      const hashTokenSpy = vi
        .spyOn(authService as any, 'hashToken')
        .mockReturnValue('matching-hash');
      const otpRecord = {
        id: 'otp-id',
        target: 'test@example.com',
        purpose: 'reset' as const,
        codeHash: 'matching-hash',
        expiresAt: new Date(Date.now() + 600000),
        usedAt: null,
        attempts: 0,
        createdAt: new Date(),
      };
      mockDb.limit.mockResolvedValueOnce([otpRecord]);
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(mockUser);
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-token-id' }]);

      const result = await authService.confirmPasswordReset(
        'test@example.com',
        '123456',
        'newpass123',
      );
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUsersService.updatePassword).toHaveBeenCalled();
      hashTokenSpy.mockRestore();
    });

    it('should throw on expired OTP', async () => {
      const expiredOtp = {
        id: 'otp-id',
        target: 'test@example.com',
        purpose: 'reset' as const,
        codeHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        attempts: 0,
        createdAt: new Date(),
      };
      mockDb.limit.mockResolvedValueOnce([expiredOtp]);

      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'newpass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw after max attempts', async () => {
      const maxAttemptsOtp = {
        id: 'otp-id',
        target: 'test@example.com',
        purpose: 'reset' as const,
        codeHash: 'hash',
        expiresAt: new Date(Date.now() + 600000),
        usedAt: null,
        attempts: 3,
        createdAt: new Date(),
      };
      mockDb.limit.mockResolvedValueOnce([maxAttemptsOtp]);

      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'newpass123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
