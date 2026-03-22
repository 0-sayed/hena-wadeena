import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const guideUploadUrlSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|avif)$/),
  filename: z.string().min(1).max(255),
  imageType: z.enum(['profile', 'cover']),
});

export class GuideUploadUrlDto extends createZodDto(guideUploadUrlSchema) {}
