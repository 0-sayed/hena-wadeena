import { REDIS_CLIENT } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import Redis from 'ioredis';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {
    const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid token');
    }

    const [isBlacklisted, isBlocked] = await this.redis.mget(
      `blacklist:${payload.jti}`,
      `blocked:${payload.sub}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    if (isBlocked) {
      throw new UnauthorizedException('Account has been suspended');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (
      user.sessionInvalidatedAt &&
      payload.iat &&
      payload.iat * 1000 <= user.sessionInvalidatedAt.getTime()
    ) {
      throw new UnauthorizedException('Session has been invalidated');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      lang: payload.lang,
      kycStatus: payload.kycStatus,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
