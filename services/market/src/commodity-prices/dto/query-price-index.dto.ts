import { CommodityCategory, NvDistrict, PriceType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryPriceIndexSchema = z.object({
  category: z.enum(Object.values(CommodityCategory) as [string, ...string[]]).optional(),
  region: z.enum(Object.values(NvDistrict) as [string, ...string[]]).optional(),
  price_type: z.enum(Object.values(PriceType) as [string, ...string[]]).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryPriceIndexDto extends createZodDto(queryPriceIndexSchema) {}
