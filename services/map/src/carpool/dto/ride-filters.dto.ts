import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { paginationSchema } from '../../utils/schemas';

const rideFiltersSchema = paginationSchema.extend({
  originLat: z.coerce.number().min(-90).max(90).optional(),
  originLng: z.coerce.number().min(-180).max(180).optional(),
  destinationLat: z.coerce.number().min(-90).max(90).optional(),
  destinationLng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(100).max(200_000).default(25_000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
});

export class RideFiltersDto extends createZodDto(rideFiltersSchema) {}
