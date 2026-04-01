import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { JwtPayload } from '../decorators/current-user.decorator';

const KYC_REQUIRED_ROLES: ReadonlySet<string> = new Set([
  'investor',
  'guide',
  'merchant',
  'student',
]);

const KYC_APPROVED = 'approved';
const ADMIN = 'admin';

@Injectable()
export class KycVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (!user) throw new UnauthorizedException('Authentication required');

    if (user.role === ADMIN) return true;

    if (KYC_REQUIRED_ROLES.has(user.role) && user.kycStatus !== KYC_APPROVED) {
      throw new ForbiddenException('KYC verification required');
    }

    return true;
  }
}
