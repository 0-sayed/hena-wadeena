import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SORT_OPTIONS = [
  'created_at|desc',
  'created_at|asc',
  'rating|desc',
  'rating|asc',
  'helpful_count|desc',
] as const;

export const queryReviewsSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(SORT_OPTIONS).default('created_at|desc'),
});

export class QueryReviewsDto extends createZodDto(queryReviewsSchema) {}
