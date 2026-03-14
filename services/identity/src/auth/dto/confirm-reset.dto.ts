import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from './shared';

const confirmResetSchema = z.object({
  email: emailField,
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export class ConfirmResetDto extends createZodDto(confirmResetSchema) {}
