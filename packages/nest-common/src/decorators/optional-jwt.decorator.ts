import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

import { OptionalJwtGuard } from '../guards/optional-jwt-auth.guard';

export const IS_OPTIONAL_JWT_KEY = 'isOptionalJwt';
/** Mark a route as optionally authenticated — populates request.user if token present, proceeds without it if not */
export const OptionalJwt = () =>
  applyDecorators(SetMetadata(IS_OPTIONAL_JWT_KEY, true), UseGuards(OptionalJwtGuard));
