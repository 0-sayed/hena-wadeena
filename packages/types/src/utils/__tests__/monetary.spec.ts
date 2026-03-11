import { describe, expect, it } from 'vitest';

import { egpToPiasters, piastresToEgp, piastresToEgpRaw } from '../monetary';

describe('monetary utilities', () => {
  describe('egpToPiasters', () => {
    it('converts whole EGP to piasters', () => {
      expect(egpToPiasters(1)).toBe(100);
      expect(egpToPiasters(10)).toBe(1000);
    });

    it('converts fractional EGP to piasters', () => {
      expect(egpToPiasters(1.5)).toBe(150);
      expect(egpToPiasters(0.01)).toBe(1);
    });

    it('rounds to avoid floating point errors', () => {
      // 19.99 * 100 = 1998.9999999... in IEEE 754
      expect(egpToPiasters(19.99)).toBe(1999);
    });

    it('handles zero', () => {
      expect(egpToPiasters(0)).toBe(0);
    });
  });

  describe('piastresToEgpRaw', () => {
    it('converts piasters to raw EGP string', () => {
      expect(piastresToEgpRaw(1500)).toBe('15.00');
      expect(piastresToEgpRaw(150)).toBe('1.50');
      expect(piastresToEgpRaw(1)).toBe('0.01');
    });

    it('handles zero', () => {
      expect(piastresToEgpRaw(0)).toBe('0.00');
    });
  });

  describe('piastresToEgp', () => {
    it('formats piasters as localized EGP string', () => {
      const result = piastresToEgp(150000);
      // Should contain the numeric value (locale-specific formatting)
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
