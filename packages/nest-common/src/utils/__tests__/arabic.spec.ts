import { describe, expect, it } from 'vitest';

import { normalizeArabic } from '../arabic';

describe('normalizeArabic', () => {
  it('strips tashkeel (diacritics)', () => {
    expect(normalizeArabic('فُنْدُق')).toBe('فندق');
  });

  it('normalizes alef variants to bare alef', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(normalizeArabic('آمال')).toBe('امال');
  });

  it('normalizes teh marbuta to heh', () => {
    expect(normalizeArabic('القاهرة')).toBe('القاهره');
    expect(normalizeArabic('مدرسة')).toBe('مدرسه');
  });

  it('removes tatweel (kashida)', () => {
    expect(normalizeArabic('فـــنـــدق')).toBe('فندق');
  });

  it('applies all transformations together', () => {
    expect(normalizeArabic('فُـنْـدُقٌ فِي القَاهِرَة')).toBe('فندق في القاهره');
  });

  it('passes through non-Arabic text unchanged', () => {
    expect(normalizeArabic('hello world')).toBe('hello world');
    expect(normalizeArabic('Hotel 123')).toBe('Hotel 123');
  });

  it('handles mixed Arabic and English', () => {
    expect(normalizeArabic('فُنْدُق Hotel')).toBe('فندق Hotel');
  });

  it('handles empty string', () => {
    expect(normalizeArabic('')).toBe('');
  });
});
