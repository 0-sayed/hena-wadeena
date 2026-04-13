import { z } from 'zod';

import { COMPENSATION_TYPES, JOB_CATEGORIES } from '../../jobs/jobs.types';

export const jobPostBaseSchema = z.object({
  title: z.string().min(3).max(255),
  descriptionAr: z.string().min(10),
  descriptionEn: z.string().optional(),
  category: z.enum(JOB_CATEGORIES),
  area: z.string(),
  compensation: z.number().int().min(0),
  compensationType: z.enum(COMPENSATION_TYPES),
  slots: z.number().int().min(1),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),
});

export const createJobPostSchema = jobPostBaseSchema.refine(
  (data) => {
    if (!data.startsAt || !data.endsAt) return true;
    return new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime();
  },
  {
    path: ['endsAt'],
    message: 'endsAt must be on or after startsAt',
  },
);
