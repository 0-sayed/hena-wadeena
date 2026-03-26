import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createApplicationSchema = z.object({
  message: z.string().max(2000).optional(),
  contactEmail: z.string().pipe(z.email()),
  contactPhone: z.string().max(20).optional(),
  amountProposed: z.number().int().positive().optional(),
});

export class CreateApplicationDto extends createZodDto(createApplicationSchema) {}
