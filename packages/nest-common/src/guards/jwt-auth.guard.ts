import { ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_OPTIONAL_JWT_KEY } from '../decorators/optional-jwt.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@Inject(Reflector) private reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isOptionalJwt = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_JWT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || isOptionalJwt) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
