import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const rejectPoiSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export class RejectPoiDto extends createZodDto(rejectPoiSchema) {}
