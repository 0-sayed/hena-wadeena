import { NvDistrict } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryBusinessesSchema = z.object({
  category: z.string().optional(),
  district: z.enum(Object.values(NvDistrict) as [string, ...string[]]).optional(),
  commodity_id: z.uuid().optional(),
  q: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryBusinessesDto extends createZodDto(queryBusinessesSchema) {}
