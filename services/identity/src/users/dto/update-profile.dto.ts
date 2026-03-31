import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from '../../auth/dto/shared';

const avatarUrlField = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:', 'data:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, 'Avatar URL must be a valid http(s) or data URL');

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Phone number must contain 7-20 digits')
  .max(20);

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  email: emailField.optional(),
  phone: phoneField.optional(),
  display_name: z.string().trim().max(100).optional(),
  avatar_url: avatarUrlField.optional(),
  language: z.enum(['ar', 'en']).optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
