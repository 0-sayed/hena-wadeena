import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export class IncidentUploadUrlDto extends createZodDto(uploadUrlSchema) {}
