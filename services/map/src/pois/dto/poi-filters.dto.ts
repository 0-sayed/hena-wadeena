import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { poiCategoryEnum, poiStatusEnum } from '../../db/enums';
import { paginationSchema } from '../../utils/schemas';

const poiFiltersSchema = paginationSchema
  .extend({
    category: z.enum(poiCategoryEnum.enumValues).optional(),
    q: z.string().max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(100).max(100_000).default(10_000),
    status: z.enum(poiStatusEnum.enumValues).optional(),
  })
  .refine((d) => (d.lat == null) === (d.lng == null), {
    message: 'lat and lng must both be provided or both omitted',
  });

export class PoiFiltersDto extends createZodDto(poiFiltersSchema) {}
