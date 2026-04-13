import { CompensationType, JobCategory } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryJobsSchema = z.object({
  category: z.enum(Object.values(JobCategory) as [string, ...string[]]).optional(),
  area: z.string().optional(),
  compensationType: z.enum(Object.values(CompensationType) as [string, ...string[]]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export class QueryJobsDto extends createZodDto(queryJobsSchema) {}
