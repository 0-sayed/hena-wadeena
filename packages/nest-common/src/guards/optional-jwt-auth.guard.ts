import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Always proceed — just try to extract user
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser | false): TUser | null {
    // Only suppress unauthorized outcomes for optional auth — re-throw real errors
    if (err && !(err instanceof UnauthorizedException)) {
      throw err;
    }
    return (user ?? null) as TUser | null;
  }
}
