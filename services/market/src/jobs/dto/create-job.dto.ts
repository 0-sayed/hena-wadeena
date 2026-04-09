import { NvDistrict } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { COMPENSATION_TYPES, JOB_CATEGORIES } from '../jobs.types';

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 1) - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateField = z.string().refine(isValidIsoDate, { message: 'Invalid date' });

export const createJobSchema = z
  .object({
    title: z.string().trim().min(1),
    descriptionAr: z.string().trim().min(1),
    descriptionEn: z.string().trim().min(1).optional(),
    category: z.enum(JOB_CATEGORIES),
    area: z.enum(Object.values(NvDistrict) as [string, ...string[]]),
    compensation: z.coerce.number().int().min(0),
    compensationType: z.enum(COMPENSATION_TYPES),
    slots: z.coerce.number().int().min(1).default(1),
    startsAt: isoDateField.optional(),
    endsAt: isoDateField.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.startsAt || !value.endsAt) {
      return;
    }

    const startsAt = new Date(`${value.startsAt}T00:00:00.000Z`);
    const endsAt = new Date(`${value.endsAt}T00:00:00.000Z`);

    if (startsAt > endsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End date must be on or after start date',
      });
    }
  });

export class CreateJobDto extends createZodDto(createJobSchema) {}
