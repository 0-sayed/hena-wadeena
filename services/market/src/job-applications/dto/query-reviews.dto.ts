import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryReviewsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  role: z.enum(['reviewer', 'reviewee']).default('reviewee'),
});

export class QueryReviewsDto extends createZodDto(queryReviewsSchema) {}
