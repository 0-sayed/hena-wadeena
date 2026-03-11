import { JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';

// expiresIn accepts ms duration strings (e.g. "15m", "7d") — values are validated
// by the env schema before reaching this function.
export function getJwtConfig(secret: string, expiresIn: StringValue): JwtModuleOptions {
  return {
    secret,
    signOptions: { expiresIn },
  };
}
