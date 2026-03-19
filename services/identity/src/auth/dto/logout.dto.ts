import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const logoutSchema = z.object({
  refresh_token: z.string().min(1).optional(),
});

export class LogoutDto extends createZodDto(logoutSchema) {}
