import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UnifiedSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or fewer'),
  type: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const arr = Array.isArray(v) ? v : v.split(',').map((t) => t.trim());
      const filtered = arr.filter((t) => t.length > 0);
      return filtered.length > 0 ? filtered : undefined;
    }),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export class UnifiedSearchQueryDto extends createZodDto(UnifiedSearchQuerySchema) {}
