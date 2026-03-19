import { UseGuards } from '@nestjs/common';

import { OptionalJwtGuard } from '../guards/optional-jwt-auth.guard';

/** Mark a route as optionally authenticated — populates request.user if token present, proceeds without it if not */
export const OptionalJwt = () => UseGuards(OptionalJwtGuard);
