import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createBookingSchema = z.object({
  packageId: z.uuid(),
  bookingDate: z.iso.date(),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Must be a valid 24-hour HH:MM time'),
  peopleCount: z.coerce.number().int().min(1),
  notes: z.string().max(1000).optional(),
});

export class CreateBookingDto extends createZodDto(createBookingSchema) {}
