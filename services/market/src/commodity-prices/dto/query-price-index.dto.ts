import { CommodityCategory, NvDistrict, PriceType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryPriceIndexSchema = z.object({
  category: z.enum(Object.values(CommodityCategory) as [string, ...string[]]).optional(),
  region: z.enum(Object.values(NvDistrict) as [string, ...string[]]).optional(),
  price_type: z.enum(Object.values(PriceType) as [string, ...string[]]).optional(),
  offset: z
    .union([z.coerce.number().int().min(0), z.literal('').transform(() => 0)])
    .optional()
    .default(0),
  limit: z
    .union([z.coerce.number().int().min(1).max(100), z.literal('').transform(() => 20)])
    .optional()
    .default(20),
});

export class QueryPriceIndexDto extends createZodDto(queryPriceIndexSchema) {}
