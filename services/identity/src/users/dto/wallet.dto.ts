import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const topupSchema = z.object({
  amount: z
    .int({ message: 'amount must be a positive integer' })
    .min(1, { message: 'amount must be a positive integer' }),
  idempotency_key: z.string().min(1),
});

export class TopupDto extends createZodDto(topupSchema) {}

const deductSchema = z.object({
  amount: z
    .int({ message: 'amount must be a positive integer' })
    .min(1, { message: 'amount must be a positive integer' }),
  idempotency_key: z.string().min(1),
  description: z.string().optional(),
  reference_id: z.string().optional(),
  reference_type: z.string().optional(),
});

export class DeductDto extends createZodDto(deductSchema) {}
