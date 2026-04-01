import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { clearTokens, getRefreshToken, setTokens } from '../auth-manager';

describe('auth-manager', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearTokens();
  });

  it('stores the refresh token in session storage only', () => {
    setTokens('access-token', 'refresh-token');

    expect(localStorage.getItem('access_token')).toBe('access-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('refresh-token');
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('reads an existing refresh token from session storage without migrating it', () => {
    sessionStorage.setItem('refresh_token', 'refresh-token');

    expect(getRefreshToken()).toBe('refresh-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('refresh-token');
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
