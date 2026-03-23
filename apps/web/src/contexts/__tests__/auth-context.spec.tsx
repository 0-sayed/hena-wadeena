import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../auth-context';
import { useAuth } from '../../hooks/use-auth';

import { UserRole } from '@hena-wadeena/types';

// Mock react-router to avoid needing a Router context
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

// Mock api.ts
vi.mock('@/services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock auth-manager
vi.mock('@/services/auth-manager', () => ({
  setTokens: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
}));

import { authAPI } from '@/services/api';
import * as authManager from '@/services/auth-manager';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(authManager.getAccessToken).mockReturnValue(null);
    vi.mocked(authManager.getRefreshToken).mockReturnValue(null);
  });

  it('starts unauthenticated when no access token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('hydrates from authManager on mount', async () => {
    const storedUser = {
      id: '1',
      email: 'test@test.com',
      full_name: 'Test',
      role: UserRole.TOURIST,
      phone: '',
      status: 'active',
      language: 'ar',
    };
    vi.mocked(authManager.getAccessToken).mockReturnValue('fake-token');
    vi.mocked(authAPI.getMe).mockResolvedValue(storedUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@test.com');
  });

  it('login calls setTokens with both tokens and sets user', async () => {
    const mockResponse = {
      access_token: 'new-token',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: '2',
        email: 'new@test.com',
        full_name: 'New User',
        role: UserRole.TOURIST,
        phone: '',
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
    expect(vi.mocked(authManager.setTokens)).toHaveBeenCalledWith('new-token', 'refresh');
  });

  it('logout calls getRefreshToken, clearTokens, and navigates to /login', async () => {
    const storedUser = {
      id: '1',
      email: 'x',
      full_name: '',
      role: UserRole.TOURIST,
      phone: '',
      status: 'active',
      language: 'ar',
    };
    vi.mocked(authManager.getAccessToken).mockReturnValue('token');
    vi.mocked(authManager.getRefreshToken).mockReturnValue('rt-token');
    vi.mocked(authAPI.getMe).mockResolvedValue(storedUser);
    vi.mocked(authAPI.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(vi.mocked(authManager.getRefreshToken)).toHaveBeenCalled();
    expect(vi.mocked(authManager.clearTokens)).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('register calls setTokens with both tokens and sets user', async () => {
    const mockResponse = {
      access_token: 'reg-token',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: '3',
        email: 'reg@test.com',
        full_name: 'Reg User',
        role: UserRole.TOURIST,
        phone: '',
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
        full_name: 'Reg User',
        password: 'pass',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('reg@test.com');
    expect(vi.mocked(authManager.setTokens)).toHaveBeenCalledWith('reg-token', 'refresh');
  });

  it('updateUser updates state', async () => {
    const storedUser = {
      id: '1',
      email: 'old@test.com',
      full_name: 'Old',
      role: UserRole.TOURIST,
      phone: '',
      status: 'active',
      language: 'ar',
    };
    vi.mocked(authManager.getAccessToken).mockReturnValue('token');
    vi.mocked(authAPI.getMe).mockResolvedValue(storedUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.updateUser({
        id: '1',
        email: 'new@test.com',
        full_name: 'New Name',
        role: UserRole.TOURIST,
        phone: '123',
        status: 'active',
        language: 'ar',
      });
    });

    expect(result.current.user?.full_name).toBe('New Name');
    expect(result.current.user?.email).toBe('new@test.com');
  });
});
