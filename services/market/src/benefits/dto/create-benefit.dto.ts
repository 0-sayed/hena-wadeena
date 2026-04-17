import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createBenefitSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  ministryAr: z.string().min(1),
  documentsAr: z.array(z.string().min(1)),
  officeNameAr: z.string().min(1),
  officePhone: z.string().min(1),
  officeAddressAr: z.string().min(1),
  enrollmentNotesAr: z.string().min(1),
});

export class CreateBenefitDto extends createZodDto(createBenefitSchema) {}
