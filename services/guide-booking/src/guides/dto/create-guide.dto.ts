import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { attractionAreaEnum } from '../../db/enums';

export const createGuideSchema = z.object({
  licenseNumber: z.string().min(1),
  basePrice: z.number().int().min(0),
  bioAr: z.string().optional(),
  bioEn: z.string().optional(),
  languages: z.array(z.enum(GuideLanguage)).optional(),
  specialties: z.array(z.enum(GuideSpecialty)).optional(),
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  areasOfOperation: z.array(z.enum(attractionAreaEnum.enumValues)).optional(),
  // ETAA + vehicle (T40)
  etaaLicenseNumber: z.string().optional(),
  insurancePolicyUrl: z.url().optional(),
  insuranceValidUntil: z.iso.date().optional(),
  vehiclePlate: z.string().optional(),
  vehicleType: z.enum(['4WD', 'minibus', 'motorcycle']).optional(),
});

export class CreateGuideDto extends createZodDto(createGuideSchema) {}
