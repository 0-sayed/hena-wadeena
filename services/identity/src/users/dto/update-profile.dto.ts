import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { emailField } from '../../auth/dto/shared';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const avatarDataUrlPrefix = /^data:image\/(?:jpeg|png|webp);base64,/i;
const base64Payload = /^[A-Za-z0-9+/]+={0,2}$/u;

function getAvatarDataUrlByteLength(value: string): number | null {
  if (!avatarDataUrlPrefix.test(value)) {
    return null;
  }

  const payload = value.slice(value.indexOf(',') + 1);
  if (payload.length === 0 || payload.length % 4 !== 0 || !base64Payload.test(payload)) {
    return null;
  }

  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return (payload.length / 4) * 3 - padding;
}

const avatarUrlField = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return true;
      }

      if (url.protocol !== 'data:') {
        return false;
      }

      return getAvatarDataUrlByteLength(value) !== null;
    } catch {
      return false;
    }
  }, 'Avatar URL must be a valid http(s) URL or JPG/PNG/WebP data URL')
  .refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'data:') {
        return true;
      }

      const avatarByteLength = getAvatarDataUrlByteLength(value);
      return avatarByteLength !== null && avatarByteLength <= MAX_AVATAR_BYTES;
    } catch {
      return false;
    }
  }, 'Avatar image must not exceed 5 MB');

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
  avatar_url: avatarUrlField.optional(),
  language: z.enum(['ar', 'en']).optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
