import { KycStatus, UserRole } from '@hena-wadeena/types';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { JwtPayload } from '../decorators/current-user.decorator';

const KYC_REQUIRED_ROLES: ReadonlySet<string> = new Set([
  UserRole.INVESTOR,
  UserRole.GUIDE,
  UserRole.MERCHANT,
  UserRole.STUDENT,
]);

const KYC_APPROVED: string = KycStatus.APPROVED;
const ADMIN: string = UserRole.ADMIN;

@Injectable()
export class KycVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (!user) throw new ForbiddenException('Authentication required');

    if (user.role === ADMIN) return true;

    if (KYC_REQUIRED_ROLES.has(user.role) && user.kycStatus !== KYC_APPROVED) {
      throw new ForbiddenException('KYC verification required');
    }

    return true;
  }
}
