import { NvDistrict, PriceType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateCommodityPriceSchema = z.object({
  price: z.number().int().min(0).optional(),
  priceType: z.enum(Object.values(PriceType) as [string, ...string[]]).optional(),
  region: z.enum(Object.values(NvDistrict) as [string, ...string[]]).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  recordedAt: z.iso.datetime().optional(),
});

export class UpdateCommodityPriceDto extends createZodDto(updateCommodityPriceSchema) {}
