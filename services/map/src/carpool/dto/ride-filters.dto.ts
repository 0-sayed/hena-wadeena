import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { paginationSchema } from '../../utils/schemas';

const rideFiltersSchema = paginationSchema
  .extend({
    originLat: z.coerce.number().min(-90).max(90).optional(),
    originLng: z.coerce.number().min(-180).max(180).optional(),
    destinationLat: z.coerce.number().min(-90).max(90).optional(),
    destinationLng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(100).max(200_000).default(25_000),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .refine(
        (val) => {
          const parts = val.split('-').map(Number);
          const y = parts[0] ?? 0;
          const m = parts[1] ?? 0;
          const d = parts[2] ?? 0;
          const date = new Date(y, m - 1, d);
          return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
        },
        { message: 'Invalid calendar date' },
      )
      .optional(),
  })
  .refine(
    (data) =>
      (data.originLat == null) === (data.originLng == null) &&
      (data.destinationLat == null) === (data.destinationLng == null),
    { message: 'Coordinate pairs (lat/lng) must be provided together' },
  );

export class RideFiltersDto extends createZodDto(rideFiltersSchema) {}
