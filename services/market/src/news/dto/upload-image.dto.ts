import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const uploadImageSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export class UploadImageDto extends createZodDto(uploadImageSchema) {}
