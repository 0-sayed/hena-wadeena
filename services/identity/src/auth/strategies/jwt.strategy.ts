import { REDIS_CLIENT } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import Redis from 'ioredis';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
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

    const isBlacklisted = await this.redis.get(`id:blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      lang: payload.lang,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
