import { UserRole } from '@hena-wadeena/types';
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

function isUserRole(role: string): role is UserRole {
  const validRoles: string[] = Object.values(UserRole);
  return validRoles.includes(role);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

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
