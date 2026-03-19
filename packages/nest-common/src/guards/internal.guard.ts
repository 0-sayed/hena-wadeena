import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Guards internal service-to-service endpoints.
 * Validates `X-Internal-Secret` header against `INTERNAL_SECRET` env var.
 * Fails closed — rejects all requests if the env var is not set.
 */
@Injectable()
export class InternalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.INTERNAL_SECRET;
    if (!secret) {
      throw new ForbiddenException('Internal endpoint not configured');
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const header = request.headers['x-internal-secret'];

    if (header !== secret) {
      throw new ForbiddenException('Invalid internal secret');
    }

    return true;
  }
}
