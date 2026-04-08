import { AlertDirection } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createPriceAlertSchema = z.object({
  commodityId: z.uuid(),
  thresholdPrice: z.number().int().min(0),
  direction: z.enum(Object.values(AlertDirection) as [string, ...string[]]),
});

export class CreatePriceAlertDto extends createZodDto(createPriceAlertSchema) {}
