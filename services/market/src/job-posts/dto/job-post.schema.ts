import { CompensationType, JobCategory } from '@hena-wadeena/types';
import { z } from 'zod';

const jobCategories = Object.values(JobCategory) as [string, ...string[]];
const compensationTypes = Object.values(CompensationType) as [string, ...string[]];

export const createJobPostSchema = z
  .object({
    title: z.string().min(3).max(255),
    descriptionAr: z.string().min(10),
    descriptionEn: z.string().optional(),
    category: z.enum(jobCategories),
    area: z.string(),
    compensation: z.number().int().min(0),
    compensationType: z.enum(compensationTypes),
    slots: z.number().int().min(1),
    startsAt: z.iso.datetime().optional(),
    endsAt: z.iso.datetime().optional(),
  })
  .refine(
    (data) => {
      if (!data.startsAt || !data.endsAt) return true;
      return new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime();
    },
    {
      path: ['endsAt'],
      message: 'endsAt must be on or after startsAt',
    },
  );
