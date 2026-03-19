import { UserRole } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from './shared';

const REGISTERABLE_ROLES = Object.values(UserRole).filter((r) => r !== UserRole.ADMIN) as [
  string,
  ...string[],
];

const registerSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').max(100),
  role: z.enum(REGISTERABLE_ROLES).default(UserRole.TOURIST),
});

export class RegisterDto extends createZodDto(registerSchema) {}
