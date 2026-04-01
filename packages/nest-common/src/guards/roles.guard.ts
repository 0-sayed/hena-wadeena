import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtPayload } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

const USER_ROLES = [
  'tourist',
  'resident',
  'merchant',
  'guide',
  'investor',
  'student',
  'driver',
  'moderator',
  'reviewer',
  'admin',
] as const;

type UserRoleName = (typeof USER_ROLES)[number];
const USER_ROLE_SET: ReadonlySet<string> = new Set(USER_ROLES);

function isUserRole(role: string): role is UserRoleName {
  return USER_ROLE_SET.has(role);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<readonly string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (!isUserRole(user.role) || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Required role(s): ${requiredRoles.join(', ')}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
