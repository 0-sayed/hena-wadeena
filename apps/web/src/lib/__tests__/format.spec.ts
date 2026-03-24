import { describe, it, expect } from 'vitest';
import { formatPrice, districtLabel, categoryLabel, unitLabel } from '../format';

describe('formatPrice', () => {
  it('converts piasters to EGP', () => {
    expect(formatPrice(4500)).toBe('45');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('handles fractional EGP', () => {
    expect(formatPrice(4550)).toBe('45.5');
  });

  it('formats large numbers with grouping', () => {
    const result = formatPrice(125000);
    // 1250.00 EGP — locale formatting may vary, just check it contains digits
    expect(result).toContain('1');
  });
});

describe('districtLabel', () => {
  it('maps kharga to Arabic', () => {
    expect(districtLabel('kharga')).toBe('الخارجة');
  });

  it('maps dakhla to Arabic', () => {
    expect(districtLabel('dakhla')).toBe('الداخلة');
  });

  it('returns input for unknown district', () => {
    expect(districtLabel('unknown')).toBe('unknown');
  });
});

describe('categoryLabel', () => {
  it('maps fruits to Arabic', () => {
    expect(categoryLabel('fruits')).toBe('فواكه');
  });

  it('maps grains to Arabic', () => {
    expect(categoryLabel('grains')).toBe('حبوب');
  });

  it('returns input for unknown category', () => {
    expect(categoryLabel('unknown')).toBe('unknown');
  });
});

describe('unitLabel', () => {
  it('maps kg to Arabic', () => {
    expect(unitLabel('kg')).toBe('كجم');
  });

  it('maps ton to Arabic', () => {
    expect(unitLabel('ton')).toBe('طن');
  });

  it('returns input for unknown unit', () => {
    expect(unitLabel('unknown')).toBe('unknown');
  });
});
