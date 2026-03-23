import { NvDistrict, PriceType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const priceEntrySchema = z.object({
  commodityId: z.uuid(),
  price: z.number().int().min(0),
  priceType: z.enum(Object.values(PriceType) as [string, ...string[]]),
  region: z.enum(Object.values(NvDistrict) as [string, ...string[]]),
});

const batchCreatePricesSchema = z.object({
  entries: z.array(priceEntrySchema).min(1).max(50),
  source: z.string().optional(),
  recordedAt: z.iso.datetime(),
});

export class BatchCreatePricesDto extends createZodDto(batchCreatePricesSchema) {}
