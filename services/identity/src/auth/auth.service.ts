import { createHash, randomBytes, randomInt } from 'node:crypto';

import { DRIZZLE_CLIENT, RedisStreamsService, generateId } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import {
  EVENTS,
  UserStatus,
  getRequiredKycDocuments,
  requiresKycForRole,
} from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import ms from 'ms';

import { auditEvents, authTokens, otpCodes } from '../db/schema/index';
import type { users } from '../db/schema/index';
import { EmailService } from '../email/email.service';
import { KycService } from '../kyc/kyc.service';
import type { SubmitKycDto } from '../kyc/dto/submit-kyc.dto';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';

import { HashingService } from './hashing.service';

type AuditEventType = typeof auditEvents.$inferInsert.eventType;

interface PendingKycSessionPayload {
  sub: string;
  email: string;
  role: string;
  purpose: string;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

interface AuthUserPayload {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  phone: string | null;
  status: string;
  language: string;
}

export interface AuthenticatedAuthResponse extends AuthTokensResponse {
  user: AuthUserPayload;
}

export interface PendingKycAuthResponse {
  status: UserStatus.PENDING_KYC;
  kyc_session_token: string;
  required_documents: readonly string[];
  user: AuthUserPayload;
}

export interface PendingKycSessionResponse {
  user: AuthUserPayload;
  required_documents: readonly string[];
  submissions: Awaited<ReturnType<KycService['findByUser']>>;
}

export type AuthResponse = AuthenticatedAuthResponse | PendingKycAuthResponse;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshExpiresMs: number;
  private readonly accessExpiresInSec: number;
  private readonly kycSessionExpiresIn: Parameters<typeof ms>[0];

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(HashingService) private readonly hashingService: HashingService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(KycService) private readonly kycService: KycService,
  ) {
    const refreshExp = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '15d') as Parameters<
      typeof ms
    >[0];
    const refreshMs = ms(refreshExp);
    if (!Number.isFinite(refreshMs) || refreshMs <= 0) {
      throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN: "${refreshExp}"`);
    }
    this.refreshExpiresMs = refreshMs;

    const accessExp = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as Parameters<
      typeof ms
    >[0];
    const accessMs = ms(accessExp);
    if (!Number.isFinite(accessMs) || accessMs <= 0) {
      throw new Error(`Invalid JWT_ACCESS_EXPIRES_IN: "${accessExp}"`);
    }
    this.accessExpiresInSec = Math.floor(accessMs / 1000);

    const kycSessionExp = this.configService.get<string>('JWT_KYC_EXPIRES_IN', '1d') as Parameters<
      typeof ms
    >[0];
    const kycSessionMs = ms(kycSessionExp);
    if (!Number.isFinite(kycSessionMs) || kycSessionMs <= 0) {
      throw new Error(`Invalid JWT_KYC_EXPIRES_IN: "${kycSessionExp}"`);
    }
    this.kycSessionExpiresIn = kycSessionExp;
  }

  async register(
    dto: { email: string; password: string; full_name: string; role: string },
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.hashingService.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      fullName: dto.full_name,
      passwordHash,
      role: dto.role,
      ...(requiresKycForRole(dto.role) && { status: UserStatus.PENDING_KYC }),
    });

    await Promise.all([
      this.recordAudit(user.id, 'register', meta?.ip, meta?.userAgent),
      this.redisStreams.publish(EVENTS.USER_REGISTERED, {
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    ]);

    return this.createPostAuthResponse(user);
  }

  async login(
    dto: { email: string; password: string },
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await this.hashingService.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.recordAudit(user.id, 'failed_login', meta?.ip, meta?.userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const blockedStatuses = new Set<string>([UserStatus.SUSPENDED, UserStatus.BANNED]);
    if (blockedStatuses.has(user.status)) {
      throw new ForbiddenException('Account is suspended');
    }

    if (this.isPendingKycUser(user)) {
      await this.recordAudit(user.id, 'login', meta?.ip, meta?.userAgent);
      return this.createPendingKycResponse(user);
    }

    const response = await this.createAuthenticatedResponse(user);

    await Promise.all([
      this.usersService.updateLastLogin(user.id),
      this.recordAudit(user.id, 'login', meta?.ip, meta?.userAgent),
    ]);

    return response;
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const [stored] = await this.db
      .select()
      .from(authTokens)
      .where(eq(authTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      await this.db
        .update(authTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(authTokens.family, stored.family), isNull(authTokens.revokedAt)));
      this.logger.warn(`Refresh token reuse detected for family ${stored.family}`);
      throw new UnauthorizedException('Token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const [, user] = await Promise.all([
      this.db.update(authTokens).set({ revokedAt: new Date() }).where(eq(authTokens.id, stored.id)),
      this.usersService.findById(stored.userId),
    ]);
    if (!user) throw new UnauthorizedException('User not found');

    const kycStatus = await this.getKycStatus(user.id);
    return this.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      lang: user.language,
      family: stored.family,
      kycStatus,
    });
  }

  async logout(payload: JwtPayload, refreshToken?: string): Promise<void> {
    if (payload.jti && payload.exp) {
      await this.sessionService.blacklistAccessToken(payload.jti, payload.exp);
    }

    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.sessionService.revokeRefreshToken(tokenHash);
    } else {
      await this.sessionService.revokeAllUserSessions(payload.sub);
    }

    await this.recordAudit(payload.sub, 'logout');
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await this.hashingService.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Invalid current password');
    const isReusedPassword = await this.hashingService.verify(user.passwordHash, newPassword);
    if (isReusedPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.usersService.updatePassword(userId, passwordHash);
    await this.sessionService.revokeAllUserSessions(userId);
    await this.recordAudit(userId, 'password_changed');
    await this.deliverEmailSafely('password change confirmation', () =>
      this.emailService.sendPasswordChangedConfirmation(user.email),
    );

    return this.createPostAuthResponse(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const otp = this.generateOtp();
    const codeHash = this.hashToken(otp);

    await this.db.insert(otpCodes).values({
      target: email,
      purpose: 'reset',
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const emailSent = await this.deliverEmailSafely('password reset OTP', () =>
      this.emailService.sendPasswordResetOtp(email, otp),
    );

    if (!emailSent && (this.configService.get<string>('NODE_ENV') ?? 'development') !== 'production') {
      this.logger.warn(`Password reset OTP for ${email}: ${otp}`);
    }
  }

  async confirmPasswordReset(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const [otpRecord] = await this.db
      .select()
      .from(otpCodes)
      .where(
        and(eq(otpCodes.target, email), eq(otpCodes.purpose, 'reset'), isNull(otpCodes.usedAt)),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');
    if (otpRecord.expiresAt < new Date()) throw new UnauthorizedException('OTP expired');
    if (otpRecord.attempts >= 3) throw new UnauthorizedException('Too many attempts');

    const codeHash = this.hashToken(otp);
    if (otpRecord.codeHash !== codeHash) {
      await this.db
        .update(otpCodes)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otpCodes.id, otpRecord.id));
      throw new UnauthorizedException('Invalid OTP');
    }

    const [, user] = await Promise.all([
      this.db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, otpRecord.id)),
      this.usersService.findByEmail(email),
    ]);
    if (!user) throw new UnauthorizedException('User not found');
    const isReusedPassword = await this.hashingService.verify(user.passwordHash, newPassword);
    if (isReusedPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.sessionService.revokeAllUserSessions(user.id);
    await this.recordAudit(user.id, 'password_reset');
    await this.deliverEmailSafely('password reset confirmation', () =>
      this.emailService.sendPasswordResetConfirmation(user.email),
    );

    return this.createPostAuthResponse(user);
  }

  async getPendingKycSession(token: string): Promise<PendingKycSessionResponse> {
    const user = await this.validatePendingKycSession(token);
    const submissions = await this.kycService.findByUser(user.id);

    return {
      user: this.toUserPayload(user),
      required_documents: getRequiredKycDocuments(user.role),
      submissions,
    };
  }

  async submitPendingKyc(token: string, dto: SubmitKycDto) {
    const user = await this.validatePendingKycSession(token);
    return this.kycService.submit(user.id, dto);
  }

  private toUserPayload(user: typeof users.$inferSelect): AuthUserPayload {
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      avatar_url: user.avatarUrl,
      phone: user.phone,
      status: user.status,
      language: user.language,
    };
  }

  private async getKycStatus(userId: string): Promise<string | undefined> {
    const submissions = await this.kycService.findByUser(userId);
    if (submissions.some((submission) => submission.status === 'approved')) {
      return 'approved';
    }

    return submissions.at(-1)?.status;
  }

  private async createPostAuthResponse(user: typeof users.$inferSelect): Promise<AuthResponse> {
    if (this.isPendingKycUser(user)) {
      return this.createPendingKycResponse(user);
    }

    return this.createAuthenticatedResponse(user);
  }

  private async createAuthenticatedResponse(
    user: typeof users.$inferSelect,
  ): Promise<AuthenticatedAuthResponse> {
    const kycStatus = await this.getKycStatus(user.id);
    const tokens = await this.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      lang: user.language,
      kycStatus,
    });

    return { ...tokens, user: this.toUserPayload(user) };
  }

  private async createPendingKycResponse(
    user: typeof users.$inferSelect,
  ): Promise<PendingKycAuthResponse> {
    return {
      status: UserStatus.PENDING_KYC,
      kyc_session_token: await this.generatePendingKycSessionToken(user),
      required_documents: getRequiredKycDocuments(user.role),
      user: this.toUserPayload(user),
    };
  }

  private async validatePendingKycSession(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<PendingKycSessionPayload>(token);
      if (payload.purpose !== 'kyc') {
        throw new UnauthorizedException('Invalid KYC session');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !this.isPendingKycUser(user)) {
        throw new UnauthorizedException('KYC session is no longer valid');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired KYC session');
    }
  }

  private async generatePendingKycSessionToken(user: typeof users.$inferSelect): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        purpose: 'kyc',
      } satisfies PendingKycSessionPayload,
      {
        expiresIn: this.kycSessionExpiresIn,
      },
    );
  }

  private async generateTokenPair(opts: {
    userId: string;
    email: string;
    role: string;
    lang: string;
    family?: string;
    kycStatus?: string;
  }): Promise<AuthTokensResponse> {
    const jti = generateId();
    const accessToken = await this.jwtService.signAsync({
      sub: opts.userId,
      email: opts.email,
      role: opts.role,
      lang: opts.lang,
      jti,
      ...(opts.kycStatus != null && { kycStatus: opts.kycStatus }),
    } satisfies JwtPayload);

    const refreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const tokenFamily = opts.family ?? generateId();

    await this.db.insert(authTokens).values({
      userId: opts.userId,
      tokenHash,
      family: tokenFamily,
      expiresAt: new Date(Date.now() + this.refreshExpiresMs),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: this.accessExpiresInSec,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isPendingKycUser(
    user: Pick<typeof users.$inferSelect, 'role' | 'status'>,
  ): boolean {
    return user.status === 'pending_kyc' && requiresKycForRole(user.role);
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async recordAudit(
    userId: string | null,
    eventType: AuditEventType,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.db.insert(auditEvents).values({
      userId,
      eventType,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
  }

  private async deliverEmailSafely(label: string, send: () => Promise<void>): Promise<boolean> {
    try {
      await send();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send ${label}: ${message}`);
      return false;
    }
  }
}
