import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from './shared';

const requestResetSchema = z.object({
  email: emailField,
});

export class RequestResetDto extends createZodDto(requestResetSchema) {}
