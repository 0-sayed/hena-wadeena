import { describe, expect, it } from 'vitest';

import {
  normalizePageParam,
  parseCompensationToPiasters,
  parseSlots,
} from './job-form.utils';

describe('job-form utils', () => {
  describe('normalizePageParam', () => {
    it('falls back to zero for invalid page values', () => {
      expect(normalizePageParam(null)).toBe(0);
      expect(normalizePageParam('foo')).toBe(0);
      expect(normalizePageParam('-1')).toBe(0);
      expect(normalizePageParam('1.5')).toBe(0);
    });

    it('returns the parsed non-negative integer page', () => {
      expect(normalizePageParam('0')).toBe(0);
      expect(normalizePageParam('7')).toBe(7);
    });
  });

  describe('parseCompensationToPiasters', () => {
    it('parses decimal currency values with string-based rounding', () => {
      expect(parseCompensationToPiasters('1')).toBe(100);
      expect(parseCompensationToPiasters('1.2')).toBe(120);
      expect(parseCompensationToPiasters('1.255')).toBe(126);
      expect(parseCompensationToPiasters('19.999')).toBe(2000);
    });

    it('rejects invalid compensation values', () => {
      expect(parseCompensationToPiasters('')).toBeNull();
      expect(parseCompensationToPiasters('-1')).toBeNull();
      expect(parseCompensationToPiasters('1e2')).toBeNull();
      expect(parseCompensationToPiasters('12..5')).toBeNull();
    });
  });

  describe('parseSlots', () => {
    it('parses positive integer slot counts only', () => {
      expect(parseSlots('1')).toBe(1);
      expect(parseSlots('12')).toBe(12);
    });

    it('rejects zero, decimals, and non-numeric slot values', () => {
      expect(parseSlots('0')).toBeNull();
      expect(parseSlots('1.5')).toBeNull();
      expect(parseSlots('abc')).toBeNull();
    });
  });
});
