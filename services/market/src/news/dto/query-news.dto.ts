import { NewsCategory } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryNewsSchema = z.object({
  category: z.enum(Object.values(NewsCategory) as [string, ...string[]]).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export class QueryNewsDto extends createZodDto(queryNewsSchema) {}

const adminQueryNewsSchema = queryNewsSchema.extend({
  status: z.enum(['draft', 'published']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export class AdminQueryNewsDto extends createZodDto(adminQueryNewsSchema) {}
