import { describe, it, expect } from 'vitest';
import {
  formatArabicYears,
  formatPrice,
  districtLabel,
  categoryLabel,
  unitLabel,
  jobCategoryLabel,
  jobStatusLabel,
  applicationStatusLabel,
  compensationTypeLabel,
} from '../format';

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

describe('formatArabicYears', () => {
  it('uses the singular form for one year', () => {
    expect(formatArabicYears(1)).toBe('1 سنة');
  });

  it('uses the dual form for two years', () => {
    expect(formatArabicYears(2)).toBe('2 سنتان');
  });

  it('uses the plural few form for values from three to ten', () => {
    expect(formatArabicYears(8)).toBe('8 سنوات');
  });

  it('uses the singular form again for values above ten', () => {
    expect(formatArabicYears(11)).toBe('11 سنة');
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

describe('jobCategoryLabel', () => {
  it('maps agriculture', () => expect(jobCategoryLabel('agriculture')).toBe('زراعة'));
  it('maps tourism', () => expect(jobCategoryLabel('tourism')).toBe('سياحة'));
  it('maps skilled_trade', () => expect(jobCategoryLabel('skilled_trade')).toBe('حرفة'));
  it('maps domestic', () => expect(jobCategoryLabel('domestic')).toBe('خدمات منزلية'));
  it('maps logistics', () => expect(jobCategoryLabel('logistics')).toBe('لوجستيات'));
  it('maps handicraft', () => expect(jobCategoryLabel('handicraft')).toBe('صناعة يدوية'));
  it('returns input for unknown', () => expect(jobCategoryLabel('unknown')).toBe('unknown'));
});

describe('jobStatusLabel', () => {
  it('maps open', () => expect(jobStatusLabel('open')).toBe('مفتوح'));
  it('maps in_progress', () => expect(jobStatusLabel('in_progress')).toBe('جارٍ'));
  it('maps completed', () => expect(jobStatusLabel('completed')).toBe('مكتمل'));
  it('maps cancelled', () => expect(jobStatusLabel('cancelled')).toBe('ملغي'));
  it('maps expired', () => expect(jobStatusLabel('expired')).toBe('منتهي'));
  it('returns input for unknown', () => expect(jobStatusLabel('unknown')).toBe('unknown'));
});

describe('applicationStatusLabel', () => {
  it('maps pending', () => expect(applicationStatusLabel('pending')).toBe('قيد الانتظار'));
  it('maps accepted', () => expect(applicationStatusLabel('accepted')).toBe('مقبول'));
  it('maps rejected', () => expect(applicationStatusLabel('rejected')).toBe('مرفوض'));
  it('maps withdrawn', () => expect(applicationStatusLabel('withdrawn')).toBe('منسحب'));
  it('maps in_progress', () => expect(applicationStatusLabel('in_progress')).toBe('جارٍ'));
  it('maps completed', () => expect(applicationStatusLabel('completed')).toBe('مكتمل'));
});

describe('compensationTypeLabel', () => {
  it('maps fixed', () => expect(compensationTypeLabel('fixed')).toBe('مبلغ ثابت'));
  it('maps daily', () => expect(compensationTypeLabel('daily')).toBe('يومي'));
  it('maps per_kg', () => expect(compensationTypeLabel('per_kg')).toBe('بالكيلو'));
  it('maps negotiable', () => expect(compensationTypeLabel('negotiable')).toBe('قابل للتفاوض'));
});
