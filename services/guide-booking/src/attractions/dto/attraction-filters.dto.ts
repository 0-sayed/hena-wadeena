import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { attractionAreaEnum, attractionTypeEnum } from '../../db/enums';

const attractionFiltersSchema = z
  .object({
    type: z.enum(attractionTypeEnum.enumValues).optional(),
    area: z.enum(attractionAreaEnum.enumValues).optional(),
    featured: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'))
      .optional(),
    nearLat: z.coerce.number().min(-90).max(90).optional(),
    nearLng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).default(25),
    search: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine((d) => (d.nearLat == null) === (d.nearLng == null), {
    message: 'nearLat and nearLng must both be provided or both omitted',
  });

export class AttractionFiltersDto extends createZodDto(attractionFiltersSchema) {}

const adminAttractionFiltersSchema = z.object({
  status: z.enum(['active', 'inactive', 'deleted']).optional(),
});

export class AdminAttractionFiltersDto extends createZodDto(adminAttractionFiltersSchema) {}

const nearbyQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(5),
  radiusKm: z.coerce.number().positive().max(100).default(50),
});

export class NearbyQueryDto extends createZodDto(nearbyQuerySchema) {}
