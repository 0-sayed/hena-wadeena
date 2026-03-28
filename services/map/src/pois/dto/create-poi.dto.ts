import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { poiCategoryEnum } from '../../db/enums';
import { locationSchema } from '../../utils/schemas';

const createPoiSchema = z.object({
  nameAr: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(poiCategoryEnum.enumValues),
  location: locationSchema,
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  website: z.url().optional(),
  images: z.array(z.string().min(1)).max(10).optional(),
});

export class CreatePoiDto extends createZodDto(createPoiSchema) {}
