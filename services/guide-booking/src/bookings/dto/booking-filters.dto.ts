import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { bookingStatusEnum } from '../../db/enums';

export const bookingFiltersSchema = z.object({
  status: z.enum(bookingStatusEnum.enumValues).optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class BookingFiltersDto extends createZodDto(bookingFiltersSchema) {}
