import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const documentUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
});

export class DocumentUploadDto extends createZodDto(documentUploadSchema) {}
