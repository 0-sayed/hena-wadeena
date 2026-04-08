import { AlertDirection } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updatePriceAlertSchema = z
  .object({
    thresholdPrice: z.number().int().min(0).optional(),
    direction: z.enum(Object.values(AlertDirection) as [string, ...string[]]).optional(),
  })
  .refine((v) => v.thresholdPrice !== undefined || v.direction !== undefined, {
    message: 'At least one field must be provided',
  });

export class UpdatePriceAlertDto extends createZodDto(updatePriceAlertSchema) {}
