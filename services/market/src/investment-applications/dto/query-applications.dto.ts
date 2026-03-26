import { ApplicationStatus } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryApplicationsSchema = z.object({
  status: z.enum(Object.values(ApplicationStatus) as [string, ...string[]]).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryApplicationsDto extends createZodDto(queryApplicationsSchema) {}
