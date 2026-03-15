import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Always proceed — just try to extract user
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser | false): TUser | null {
    // Don't throw on missing/invalid token — just return null
    return (user || null) as TUser | null;
  }
}
