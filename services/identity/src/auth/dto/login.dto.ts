import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from './shared';

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export class LoginDto extends createZodDto(loginSchema) {}
