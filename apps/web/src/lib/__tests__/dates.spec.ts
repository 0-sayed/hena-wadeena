import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime } from '../dates';

describe('formatDate', () => {
  it('formats a date string in Arabic', () => {
    const result = formatDate('2026-03-19T12:00:00Z');
    // Intl.DateTimeFormat('ar-EG') produces Arabic numerals and month names
    expect(result).toContain('٢٠٢٦');
    expect(result).toContain('مارس');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-01-15T12:00:00Z'));
    expect(result).toContain('٢٠٢٦');
    expect(result).toContain('يناير');
  });
});

describe('formatDateTime', () => {
  it('includes time in the output', () => {
    const result = formatDateTime('2026-03-19T14:30:00Z');
    expect(result).toContain('٢٠٢٦');
    // Should contain hour digits
    expect(result).toMatch(/[٠-٩]{1,2}:[٠-٩]{2}/);
  });
});

describe('formatRelativeTime', () => {
  it('returns an Arabic relative time string', () => {
    const recent = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const result = formatRelativeTime(recent);
    // date-fns arEG locale should produce Arabic text with "منذ" (ago)
    expect(result).toContain('منذ');
  });
});
