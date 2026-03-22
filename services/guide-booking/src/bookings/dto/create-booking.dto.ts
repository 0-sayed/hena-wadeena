import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createBookingSchema = z.object({
  packageId: z.uuid(),
  bookingDate: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  peopleCount: z.coerce.number().int().min(1),
  notes: z.string().max(1000).optional(),
});

export class CreateBookingDto extends createZodDto(createBookingSchema) {}
