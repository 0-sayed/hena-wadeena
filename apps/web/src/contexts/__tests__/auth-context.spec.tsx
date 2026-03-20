import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../auth-context';
import { useAuth } from '../../hooks/use-auth';

import { UserRole } from '@hena-wadeena/types';

// Mock api.ts
vi.mock('@/services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
  },
  registerUnauthorizedCallback: vi.fn(),
}));

import { authAPI, registerUnauthorizedCallback } from '@/services/api';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when localStorage is empty', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('hydrates from localStorage on mount', async () => {
    const storedUser = {
      id: '1',
      email: 'test@test.com',
      phone: '123',
      full_name: 'Test',
      role: UserRole.TOURIST,
      status: 'active',
      language: 'ar',
    };
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@test.com');
  });

  it('login stores token and user', async () => {
    const mockResponse = {
      access_token: 'new-token',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: '2',
        email: 'new@test.com',
        phone: '456',
        full_name: 'New User',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'ar',
      },
    };
    vi.mocked(authAPI.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login({ email: 'new@test.com', password: 'pass' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('new@test.com');
    expect(localStorage.getItem('access_token')).toBe('new-token');
  });

  it('logout clears state and localStorage', async () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: '1',
        email: 'x',
        phone: '',
        full_name: '',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'ar',
      }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('register stores token and user', async () => {
    const mockResponse = {
      access_token: 'reg-token',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: '3',
        email: 'reg@test.com',
        phone: '789',
        full_name: 'Reg User',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'ar',
      },
    };
    vi.mocked(authAPI.register).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register({
        email: 'reg@test.com',
        phone: '789',
        full_name: 'Reg User',
        password: 'pass',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('reg@test.com');
    expect(localStorage.getItem('access_token')).toBe('reg-token');
  });

  it('updateUser updates state and localStorage', async () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: '1',
        email: 'old@test.com',
        phone: '',
        full_name: 'Old',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'ar',
      }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.updateUser({
        id: '1',
        email: 'new@test.com',
        phone: '123',
        full_name: 'New Name',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'ar',
      });
    });

    expect(result.current.user?.full_name).toBe('New Name');
    expect(result.current.user?.email).toBe('new@test.com');
    const stored = JSON.parse(localStorage.getItem('user')!) as { full_name: string };
    expect(stored.full_name).toBe('New Name');
  });

  it('registers 401 callback on mount', () => {
    renderHook(() => useAuth(), { wrapper });
    expect(registerUnauthorizedCallback).toHaveBeenCalledWith(expect.any(Function));
  });
});
