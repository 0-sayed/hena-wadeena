import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or fewer'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export class SearchQueryDto extends createZodDto(SearchQuerySchema) {}
