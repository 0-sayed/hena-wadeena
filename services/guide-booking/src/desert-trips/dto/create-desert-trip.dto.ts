import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createDesertTripSchema = z.object({
  expectedArrivalAt: z.iso.datetime({ message: 'Must be an ISO 8601 datetime' }),
  destinationName: z.string().min(1),
  emergencyContact: z.string().min(1),
  rangerStationName: z.string().min(1).optional(),
});

export class CreateDesertTripDto extends createZodDto(createDesertTripSchema) {}
