import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { attractionAreaEnum } from '../../db/enums';

const packageFiltersSchema = z.object({
  area: z.enum(attractionAreaEnum.enumValues).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minDuration: z.coerce.number().int().positive().optional(),
  maxDuration: z.coerce.number().int().positive().optional(),
  minPeople: z.coerce.number().int().positive().optional(),
  search: z.string().min(1).max(100).optional(),
  guideId: z.uuid().optional(),
  attractionId: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class PackageFiltersDto extends createZodDto(packageFiltersSchema) {}
