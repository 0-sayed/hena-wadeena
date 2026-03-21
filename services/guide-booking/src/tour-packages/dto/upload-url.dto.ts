import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const packageUploadUrlSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|avif)$/),
  filename: z.string().min(1).max(255),
});

export class PackageUploadUrlDto extends createZodDto(packageUploadUrlSchema) {}
