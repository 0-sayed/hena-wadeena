import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const cancelBookingSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

export class CancelBookingDto extends createZodDto(cancelBookingSchema) {}
