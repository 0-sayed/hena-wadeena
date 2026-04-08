import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveMediaUrl } from './media';

describe('resolveMediaUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves relative asset paths against the API origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hena.test/api/v1');

    expect(resolveMediaUrl('/uploads/logos/company.png')).toBe(
      'https://api.hena.test/uploads/logos/company.png',
    );
  });

  it('returns absolute and data URLs unchanged', () => {
    expect(resolveMediaUrl('https://cdn.hena.test/logo.png')).toBe(
      'https://cdn.hena.test/logo.png',
    );
    expect(resolveMediaUrl('data:image/png;base64,abc123')).toBe('data:image/png;base64,abc123');
  });
});
