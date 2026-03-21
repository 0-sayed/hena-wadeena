import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const uploadUrlSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|avif)$/),
  filename: z.string().min(1).max(255),
});

export class UploadUrlDto extends createZodDto(uploadUrlSchema) {}
