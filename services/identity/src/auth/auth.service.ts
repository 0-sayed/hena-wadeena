import { randomBytes, createHash, randomInt } from 'node:crypto';

import {
  DRIZZLE_CLIENT,
  REDIS_CLIENT,
  RedisStreamsService,
  generateId,
} from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import ms from 'ms';

import { authTokens, auditEvents, otpCodes } from '../db/schema/index';
import type { users } from '../db/schema/index';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

import { HashingService } from './hashing.service';

type AuditEventType = typeof auditEvents.$inferInsert.eventType;

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    avatar_url: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshExpiresMs: number;
  private readonly accessExpiresInSec: number;

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(HashingService) private readonly hashingService: HashingService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    const refreshExp = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as Parameters<
      typeof ms
    >[0];
    this.refreshExpiresMs = ms(refreshExp);

    const accessExp = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as Parameters<
      typeof ms
    >[0];
    this.accessExpiresInSec = Math.floor(ms(accessExp) / 1000);
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
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, user.language);

    // Fire-and-forget: audit + event are independent of each other and the response
    await Promise.all([
      this.recordAudit(user.id, 'register', meta?.ip, meta?.userAgent),
      this.redisStreams.publish(EVENTS.USER_REGISTERED, {
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    ]);

    return { ...tokens, user: this.toUserPayload(user) };
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

    if (user.status === 'suspended' || user.status === 'banned') {
      throw new ForbiddenException('Account is suspended');
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, user.language);

    // Independent side-effects — parallelize
    await Promise.all([
      this.usersService.updateLastLogin(user.id),
      this.recordAudit(user.id, 'login', meta?.ip, meta?.userAgent),
    ]);

    return { ...tokens, user: this.toUserPayload(user) };
  }

  async refresh(refreshToken: string): Promise<Omit<AuthResponse, 'user'>> {
    const tokenHash = this.hashToken(refreshToken);
    const [stored] = await this.db
      .select()
      .from(authTokens)
      .where(eq(authTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      // Reuse detection: revoke entire family
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

    // Revoke current token + fetch user in parallel (independent tables)
    const [, user] = await Promise.all([
      this.db.update(authTokens).set({ revokedAt: new Date() }).where(eq(authTokens.id, stored.id)),
      this.usersService.findById(stored.userId),
    ]);
    if (!user) throw new UnauthorizedException('User not found');

    // Issue new token pair with same family
    return this.generateTokenPair(user.id, user.email, user.role, user.language, stored.family);
  }

  async logout(payload: JwtPayload, refreshToken?: string): Promise<void> {
    // Blacklist the access token by its JTI until it naturally expires
    if (payload.jti && payload.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.set(`id:blacklist:${payload.jti}`, '1', 'EX', ttl);
      }
    }

    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.db
        .update(authTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(authTokens.tokenHash, tokenHash), isNull(authTokens.revokedAt)));
    } else {
      // Fallback: revoke all active refresh tokens for user
      await this.db
        .update(authTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(authTokens.userId, payload.sub), isNull(authTokens.revokedAt)));
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

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.usersService.updatePassword(userId, passwordHash);

    // Revoke all existing sessions
    await this.db
      .update(authTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), isNull(authTokens.revokedAt)));

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, user.language);
    await this.recordAudit(userId, 'password_changed');

    return { ...tokens, user: this.toUserPayload(user) };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Silent — prevent email enumeration

    const otp = this.generateOtp();
    const codeHash = this.hashToken(otp);

    await this.db.insert(otpCodes).values({
      target: email,
      purpose: 'reset',
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await this.emailService.sendPasswordResetOtp(email, otp);
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

    // Mark OTP as used + fetch user in parallel (independent)
    const [, user] = await Promise.all([
      this.db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, otpRecord.id)),
      this.usersService.findByEmail(email),
    ]);
    if (!user) throw new UnauthorizedException('User not found');

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.usersService.updatePassword(user.id, passwordHash);

    // Revoke all sessions
    await this.db
      .update(authTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(authTokens.userId, user.id), isNull(authTokens.revokedAt)));

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, user.language);
    await this.recordAudit(user.id, 'password_reset');

    return { ...tokens, user: this.toUserPayload(user) };
  }

  // --- Private helpers ---

  private toUserPayload(user: typeof users.$inferSelect): AuthResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      avatar_url: user.avatarUrl,
    };
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    lang: string,
    family?: string,
  ) {
    const jti = generateId();
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email,
      role,
      lang,
      jti,
    } satisfies JwtPayload);

    const refreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const tokenFamily = family ?? generateId();

    await this.db.insert(authTokens).values({
      userId,
      tokenHash,
      family: tokenFamily,
      expiresAt: new Date(Date.now() + this.refreshExpiresMs),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer' as const,
      expires_in: this.accessExpiresInSec,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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
}
