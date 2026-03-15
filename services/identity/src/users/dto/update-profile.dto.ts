import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
  language: z.enum(['ar', 'en']).optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
