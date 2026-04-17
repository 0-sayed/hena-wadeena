import { describe, expect, it } from 'vitest';

import { UpdateBenefitDto } from './update-benefit.dto';

describe('UpdateBenefitDto', () => {
  it('accepts null for enrollmentNotesEn so admins can clear the field', () => {
    const schema = (UpdateBenefitDto as { schema: { parse: (input: unknown) => unknown } }).schema;

    expect(schema.parse({ enrollmentNotesEn: null })).toEqual({ enrollmentNotesEn: null });
  });
});
