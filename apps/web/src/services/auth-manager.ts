/**
 * auth-manager.ts — Token Lifecycle Management
 * =============================================
 * Single source of truth for token state.
 * - Access token: localStorage (survives page refresh)
 * - Refresh token: in-memory module variable (lost on page refresh — by design)
 */

import { apiFetch, ApiError } from './api';

// ── Module-level state ───────────────────────────────────────────────────────

let refreshToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// ── Token lifecycle ──────────────────────────────────────────────────────────

export function setTokens(accessToken: string, rt: string): void {
  localStorage.setItem('access_token', accessToken);
  refreshToken = rt;
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
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
