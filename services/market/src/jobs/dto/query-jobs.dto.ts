import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { COMPENSATION_TYPES, JOB_CATEGORIES } from '../jobs.types';

const queryJobsSchema = z.object({
  category: z.enum(JOB_CATEGORIES).optional(),
  area: z.string().optional(),
  compensationType: z.enum(COMPENSATION_TYPES).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryJobsDto extends createZodDto(queryJobsSchema) {}
