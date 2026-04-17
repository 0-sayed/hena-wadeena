import { describe, expect, it } from 'vitest';

import { getIncidentDescription } from '../incidents';

describe('getIncidentDescription', () => {
  it('uses the English description when available', () => {
    expect(
      getIncidentDescription(
        { descriptionAr: 'وصف عربي', descriptionEn: 'English description' },
        'en',
      ),
    ).toEqual({
      text: 'English description',
      dir: 'ltr',
    });
  });

  it('falls back to Arabic for English sessions when no English description exists', () => {
    expect(
      getIncidentDescription({ descriptionAr: 'وصف عربي', descriptionEn: null }, 'en'),
    ).toEqual({
      text: 'وصف عربي',
      dir: 'rtl',
    });
  });

  it('returns Arabic with rtl direction for Arabic sessions', () => {
    expect(
      getIncidentDescription(
        { descriptionAr: 'وصف عربي', descriptionEn: 'English description' },
        'ar',
      ),
    ).toEqual({
      text: 'وصف عربي',
      dir: 'rtl',
    });
  });

  it('returns null when no description exists in either language', () => {
    expect(getIncidentDescription({ descriptionAr: null, descriptionEn: null }, 'en')).toBeNull();
  });
});
