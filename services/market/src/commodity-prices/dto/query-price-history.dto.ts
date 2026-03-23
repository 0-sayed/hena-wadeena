import { NvDistrict, PriceType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryPriceHistorySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  region: z.enum(Object.values(NvDistrict) as [string, ...string[]]).optional(),
  price_type: z.enum(Object.values(PriceType) as [string, ...string[]]).optional(),
});

export class QueryPriceHistoryDto extends createZodDto(queryPriceHistorySchema) {}
