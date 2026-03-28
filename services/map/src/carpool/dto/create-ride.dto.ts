import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { locationSchema } from '../../utils/schemas';

const createRideSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  originName: z.string().min(1).max(200),
  destinationName: z.string().min(1).max(200),
  departureTime: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: 'Departure time must be in the future',
  }),
  seatsTotal: z.number().int().min(1).max(8),
  pricePerSeat: z.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export class CreateRideDto extends createZodDto(createRideSchema) {}
