import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { requiresKycForRole } from '@hena-wadeena/types';

import type { JwtPayload } from '../decorators/current-user.decorator';

const KYC_APPROVED = 'approved';
const ADMIN = 'admin';

@Injectable()
export class KycVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (!user) throw new UnauthorizedException('Authentication required');

    if (user.role === ADMIN) return true;

    if (requiresKycForRole(user.role) && user.kycStatus !== KYC_APPROVED) {
      throw new ForbiddenException('KYC verification required');
    }

    return true;
  }
}
