import { NvDistrict } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { COMPENSATION_TYPES, JOB_CATEGORIES } from '../jobs.types';

const createJobSchema = z.object({
  title: z.string().trim().min(1),
  descriptionAr: z.string().trim().min(1),
  descriptionEn: z.string().trim().min(1).optional(),
  category: z.enum(JOB_CATEGORIES),
  area: z.enum(Object.values(NvDistrict) as [string, ...string[]]),
  compensation: z.coerce.number().int().min(0),
  compensationType: z.enum(COMPENSATION_TYPES),
  slots: z.coerce.number().int().min(1).default(1),
  startsAt: z.string().trim().min(1).optional(),
  endsAt: z.string().trim().min(1).optional(),
});

export class CreateJobDto extends createZodDto(createJobSchema) {}
