import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryBusinessInquiriesSchema = z.object({
  status: z.enum(['pending', 'read', 'replied']).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryBusinessInquiriesDto extends createZodDto(queryBusinessInquiriesSchema) {}
