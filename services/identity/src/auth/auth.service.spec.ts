import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@hena-wadeena/types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EmailService } from '../email/email.service';
import { KycService } from '../kyc/kyc.service';
import { createMockDb } from '../test-utils/create-mock-db';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';
import type { AuthResponse, AuthenticatedAuthResponse, PendingKycAuthResponse } from './auth.service';

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
  sessionInvalidatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  searchVector: null,
  balancePiasters: 0,
};

function expectAuthenticated(result: AuthResponse): AuthenticatedAuthResponse {
  expect('access_token' in result).toBe(true);
  if (!('access_token' in result)) {
    throw new Error('Expected authenticated auth response');
  }

  return result;
}

function expectPendingKyc(result: AuthResponse): PendingKycAuthResponse {
  expect('status' in result).toBe(true);
  if (!('status' in result)) {
    throw new Error('Expected pending KYC auth response');
  }

  expect(result.status).toBe(UserStatus.PENDING_KYC);
  return result;
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: UsersService;
  let mockHashingService: HashingService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockSessionService: {
    blacklistAccessToken: ReturnType<typeof vi.fn>;
    revokeRefreshToken: ReturnType<typeof vi.fn>;
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
    blockUser: ReturnType<typeof vi.fn>;
    unblockUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = createMockDb();
    mockSessionService = {
      blacklistAccessToken: vi.fn().mockResolvedValue(undefined),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
      revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
      blockUser: vi.fn().mockResolvedValue(undefined),
      unblockUser: vi.fn().mockResolvedValue(undefined),
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
      sendPasswordChangedConfirmation: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetConfirmation: vi.fn().mockResolvedValue(undefined),
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
          JWT_REFRESH_EXPIRES_IN: '15d',
        };
        return config[key] ?? defaultVal;
      }),
    };

    const mockRedisStreams = {
      publish: vi.fn().mockResolvedValue('mock-stream-id'),
    };

    const mockKycService = {
      findByUser: vi.fn().mockResolvedValue([]),
    } as unknown as KycService;

    authService = new AuthService(
      mockUsersService,
      mockHashingService,
      mockEmailService,

      mockJwtService as any,

      mockConfigService as any,

      mockRedisStreams as any,

      mockDb as any,

      mockSessionService as any,

      mockKycService,
    );
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockUsersService, 'create').mockResolvedValue(mockUser);
      const hashSpy = vi.spyOn(mockHashingService, 'hash').mockResolvedValue('$argon2id$hashed');

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        full_name: 'New User',
        role: 'tourist',
      });
      const authenticatedResult = expectAuthenticated(result);

      expect(authenticatedResult.access_token).toBeDefined();
      expect(authenticatedResult.refresh_token).toBeDefined();
      expect(authenticatedResult.user.email).toBe('test@example.com');
      expect(hashSpy).toHaveBeenCalledWith('password123');
      expect(createSpy).toHaveBeenCalled();
    });

    it('returns a pending KYC flow for roles that require verification', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockUsersService, 'create').mockResolvedValue({
        ...mockUser,
        role: 'guide',
        status: UserStatus.PENDING_KYC,
      });

      const result = await authService.register({
        email: 'guide@example.com',
        password: 'password123',
        full_name: 'Guide User',
        role: 'guide',
      });
      const pendingResult = expectPendingKyc(result);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.PENDING_KYC,
        }),
      );
      expect(pendingResult.status).toBe(UserStatus.PENDING_KYC);
      expect(pendingResult.required_documents).toEqual(['national_id', 'guide_license']);
      expect(pendingResult.kyc_session_token).toBeDefined();
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
      const authenticatedResult = expectAuthenticated(result);

      expect(authenticatedResult.access_token).toBeDefined();
      expect(authenticatedResult.refresh_token).toBeDefined();
      expect(authenticatedResult.user.id).toBe('user-uuid');
    });

    it('returns a pending KYC flow instead of full tokens for pending users', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue({
        ...mockUser,
        role: 'guide',
        status: UserStatus.PENDING_KYC,
      });
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(true);
      const updateLastLoginSpy = vi.spyOn(mockUsersService, 'updateLastLogin');

      const result = await authService.login({
        email: 'guide@example.com',
        password: 'password123',
      });
      const pendingResult = expectPendingKyc(result);

      expect(pendingResult.status).toBe(UserStatus.PENDING_KYC);
      expect(pendingResult.required_documents).toEqual(['national_id', 'guide_license']);
      expect(pendingResult.kyc_session_token).toBeDefined();
      expect(updateLastLoginSpy).not.toHaveBeenCalled();
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
      expect(mockSessionService.blacklistAccessToken).toHaveBeenCalled();
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password and return new tokens', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-token-id' }]);
      const updatePasswordSpy = vi.spyOn(mockUsersService, 'updatePassword');
      const confirmationSpy = vi.spyOn(
        authService['emailService'],
        'sendPasswordChangedConfirmation',
      );

      const result = await authService.changePassword('user-uuid', 'oldpass', 'newpass123');
      const authenticatedResult = expectAuthenticated(result);
      expect(authenticatedResult.access_token).toBeDefined();
      expect(updatePasswordSpy).toHaveBeenCalled();
      expect(confirmationSpy).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw on wrong current password', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(false);

      await expect(authService.changePassword('user-uuid', 'wrong', 'newpass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject reusing the current password', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(true);

      await expect(authService.changePassword('user-uuid', 'oldpass', 'oldpass')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('still changes the password when the confirmation email fails', async () => {
      vi.spyOn(mockUsersService, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHashingService, 'verify')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      vi.spyOn(mockUsersService, 'updatePassword').mockResolvedValue(undefined);
      vi.spyOn(authService['emailService'], 'sendPasswordChangedConfirmation').mockRejectedValue(
        new Error('email provider unavailable'),
      );

      const result = await authService.changePassword('user-uuid', 'oldpass', 'newpass123');
      const authenticatedResult = expectAuthenticated(result);

      expect(authenticatedResult.access_token).toBeDefined();
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-uuid');
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

    it('still succeeds when the reset OTP email cannot be sent', async () => {
      vi.spyOn(mockUsersService, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(authService['emailService'], 'sendPasswordResetOtp').mockRejectedValue(
        new Error('email provider unavailable'),
      );

      await expect(authService.requestPasswordReset('test@example.com')).resolves.not.toThrow();
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
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(false);
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-token-id' }]);
      const updatePasswordSpy = vi.spyOn(mockUsersService, 'updatePassword');
      const confirmationSpy = vi.spyOn(
        authService['emailService'],
        'sendPasswordResetConfirmation',
      );

      const result = await authService.confirmPasswordReset(
        'test@example.com',
        '123456',
        'newpass123',
      );
      const authenticatedResult = expectAuthenticated(result);
      expect(authenticatedResult.access_token).toBeDefined();
      expect(authenticatedResult.refresh_token).toBeDefined();
      expect(authenticatedResult.user.email).toBe('test@example.com');
      expect(updatePasswordSpy).toHaveBeenCalled();
      expect(confirmationSpy).toHaveBeenCalledWith('test@example.com');
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

    it('should reject reusing the current password during reset', async () => {
      const hashTokenSpy = vi
        .spyOn(authService as unknown as { hashToken(token: string): string }, 'hashToken')
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
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(true);

      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'oldpass'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
      hashTokenSpy.mockRestore();
    });

    it('still resets the password when the confirmation email fails', async () => {
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
      vi.spyOn(mockHashingService, 'verify').mockResolvedValue(false);
      vi.spyOn(authService['emailService'], 'sendPasswordResetConfirmation').mockRejectedValue(
        new Error('email provider unavailable'),
      );

      const result = await authService.confirmPasswordReset(
        'test@example.com',
        '123456',
        'newpass123',
      );
      const authenticatedResult = expectAuthenticated(result);

      expect(authenticatedResult.refresh_token).toBeDefined();
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user-uuid');
      hashTokenSpy.mockRestore();
    });
  });
});
