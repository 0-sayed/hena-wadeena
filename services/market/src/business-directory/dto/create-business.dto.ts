import { NvDistrict } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createBusinessSchema = z.object({
  nameAr: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  district: z.enum(Object.values(NvDistrict) as [string, ...string[]]),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  phone: z.string().optional(),
  website: z
    .url()
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'website must use http or https',
    })
    .optional(),
  commodityIds: z.array(z.uuid()).max(50).optional(),
});

export class CreateBusinessDto extends createZodDto(createBusinessSchema) {}
