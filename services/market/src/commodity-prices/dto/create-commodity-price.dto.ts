import { NvDistrict, PriceType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createCommodityPriceSchema = z.object({
  commodityId: z.uuid(),
  price: z.number().int().min(0),
  priceType: z.enum(Object.values(PriceType) as [string, ...string[]]),
  region: z.enum(Object.values(NvDistrict) as [string, ...string[]]),
  source: z.string().optional(),
  notes: z.string().optional(),
  recordedAt: z.iso.datetime(),
});

export class CreateCommodityPriceDto extends createZodDto(createCommodityPriceSchema) {}
