import { describe, expect, it } from 'vitest';

import { createJobSchema } from './create-job.dto';

const basePayload = {
  title: 'عامل تعبئة',
  descriptionAr: 'وصف بالعربية',
  category: 'agriculture',
  area: 'kharga',
  compensation: 45000,
  compensationType: 'daily',
  slots: 1,
};

describe('createJobSchema', () => {
  it('accepts valid ISO date ranges', () => {
    const result = createJobSchema.safeParse({
      ...basePayload,
      startsAt: '2026-04-10',
      endsAt: '2026-04-12',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid date strings', () => {
    const result = createJobSchema.safeParse({
      ...basePayload,
      startsAt: '2026-02-30',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Invalid date');
  });

  it('rejects inverted date ranges', () => {
    const result = createJobSchema.safeParse({
      ...basePayload,
      startsAt: '2026-04-12',
      endsAt: '2026-04-10',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === 'End date must be on or after start date')).toBe(true);
  });
});
