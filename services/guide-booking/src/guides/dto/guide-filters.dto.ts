import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { attractionAreaEnum } from '../../db/enums';

const guideFiltersSchema = z
  .object({
    language: z.enum(GuideLanguage).optional(),
    specialty: z.enum(GuideSpecialty).optional(),
    area: z.enum(attractionAreaEnum.enumValues).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    verified: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'))
      .optional(),
    search: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['maxPrice'],
  });

export class GuideFiltersDto extends createZodDto(guideFiltersSchema) {}
