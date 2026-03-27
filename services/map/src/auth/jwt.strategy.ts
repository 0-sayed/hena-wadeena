import { REDIS_CLIENT } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Inject, Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import Redis from 'ioredis';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) implements OnModuleDestroy {
  private readonly identityRedis: Redis;

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

    this.identityRedis = redis.duplicate({ keyPrefix: '' });
  }

  async onModuleDestroy() {
    await this.identityRedis.quit();
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.jti || !payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token');
    }

    const [isBlacklisted, isBlocked] = await this.identityRedis.mget(
      `id:blacklist:${payload.jti}`,
      `id:blocked:${payload.sub}`,
    );

    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    if (isBlocked) {
      throw new UnauthorizedException('Account has been suspended');
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
