/**
 * auth-manager.ts — Token Lifecycle Management
 * =============================================
 * Single source of truth for token state.
 * - Access token: localStorage
 * - Refresh token: sessionStorage + in-memory cache
 */

import { apiFetch, ApiError } from './api';

// ── Module-level state ───────────────────────────────────────────────────────

let refreshToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// ── Token lifecycle ──────────────────────────────────────────────────────────

export function setTokens(accessToken: string, rt: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, rt);
  refreshToken = rt;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;

  refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken && localStorage.getItem(REFRESH_TOKEN_KEY)) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  return refreshToken;
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  refreshToken = null;
}

// ── Refresh interceptor ──────────────────────────────────────────────────────

const AUTH_PASSTHROUGH = ['/auth/login', '/auth/register', '/auth/refresh'];

export async function apiFetchWithRefresh<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (AUTH_PASSTHROUGH.some((p) => endpoint.startsWith(p))) {
    return apiFetch<T>(endpoint, options);
  }

  try {
    return await apiFetch<T>(endpoint, options);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      throw err;
    }

    const rt = getRefreshToken();

    if (!rt) {
      clearTokens();
      window.location.href = '/login';
      throw err;
    }

    if (isRefreshing) {
      await refreshPromise;
      return apiFetch<T>(endpoint, options);
    }

    isRefreshing = true;
    refreshPromise = apiFetch<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: rt }),
    })
      .then((tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token);
      })
      .catch((refreshErr: unknown) => {
        clearTokens();
        window.location.href = '/login';
        throw refreshErr;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    await refreshPromise;
    return apiFetch<T>(endpoint, options);
  }
}
