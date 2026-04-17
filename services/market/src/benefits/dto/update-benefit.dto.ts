import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateBenefitSchema = z.object({
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  ministryAr: z.string().min(1).optional(),
  documentsAr: z.array(z.string().min(1)).optional(),
  officeNameAr: z.string().min(1).optional(),
  officePhone: z.string().min(1).optional(),
  officeAddressAr: z.string().min(1).optional(),
  enrollmentNotesAr: z.string().min(1).optional(),
  enrollmentNotesEn: z.string().min(1).optional(),
});

export class UpdateBenefitDto extends createZodDto(updateBenefitSchema) {}
