import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from '../../auth/dto/shared';

const avatarUrlField = z
  .string()
  .trim()
  .max(3_000_000, 'Avatar data too large')
  .refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return true;
      }

      if (url.protocol !== 'data:') {
        return false;
      }

      return /^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
    } catch {
      return false;
    }
  }, 'Avatar URL must be a valid http(s) URL or JPG/PNG/WebP data URL');

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Phone number must contain 7-20 digits')
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 20;
  }, 'Phone number must contain 7-20 digits');

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  email: emailField.optional(),
  phone: phoneField.optional(),
  display_name: z.string().trim().max(100).optional(),
  avatar_url: avatarUrlField.optional(),
  language: z.enum(['ar', 'en']).optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
