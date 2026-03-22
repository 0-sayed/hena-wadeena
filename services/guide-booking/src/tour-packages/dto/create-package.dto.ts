import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPackageSchema = z.object({
  titleAr: z.string().min(1),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  durationHours: z.number().int().positive(),
  maxPeople: z.number().int().min(1),
  price: z.number().int().positive(),
  includes: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  attractionIds: z.array(z.uuid()).optional(),
});

export class CreatePackageDto extends createZodDto(createPackageSchema) {}
