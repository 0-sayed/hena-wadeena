import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
