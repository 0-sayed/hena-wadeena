import { describe, it, expect } from 'vitest';

describe('app smoke test', () => {
  it('should have a valid test environment', () => {
    expect(document).toBeDefined();
    expect(typeof document.createElement).toBe('function');
  });
});
