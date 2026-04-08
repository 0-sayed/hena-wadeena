import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  offset: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(100).default(20),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export class QueryWellLogsDto extends createZodDto(schema) {}
