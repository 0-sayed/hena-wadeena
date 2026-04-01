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
    updateMe: vi.fn(),
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
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

  it('setLanguage persists the authenticated user preference', async () => {
    const storedUser = {
      id: '1',
      email: 'lang@test.com',
      full_name: 'Language User',
      role: UserRole.TOURIST,
      phone: '',
      status: 'active',
      language: 'ar',
    };
    vi.mocked(authManager.getAccessToken).mockReturnValue('token');
    vi.mocked(authAPI.getMe).mockResolvedValue(storedUser);
    vi.mocked(authAPI.updateMe).mockResolvedValue({
      ...storedUser,
      language: 'en',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.setLanguage('en');
    });

    expect(vi.mocked(authAPI.updateMe)).toHaveBeenCalledWith({ language: 'en' });
    expect(result.current.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('restores the previous language after a failed update and logout', async () => {
    const storedUser = {
      id: '1',
      email: 'lang@test.com',
      full_name: 'Language User',
      role: UserRole.TOURIST,
      phone: '',
      status: 'active',
      language: 'ar',
    };
    vi.mocked(authManager.getAccessToken).mockReturnValue('token');
    vi.mocked(authAPI.getMe).mockResolvedValue(storedUser);
    vi.mocked(authAPI.updateMe).mockRejectedValue(new Error('Update failed'));
    vi.mocked(authAPI.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await expect(result.current.setLanguage('en')).rejects.toThrow('Update failed');
    });

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.language).toBe('ar');
    });

    expect(localStorage.getItem('hena-wadeena:language')).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('ignores stale setLanguage responses when requests finish out of order', async () => {
    const storedUser = {
      id: '1',
      email: 'lang@test.com',
      full_name: 'Language User',
      role: UserRole.TOURIST,
      phone: '',
      status: 'active',
      language: 'ar',
    };
    const firstUpdate = createDeferred<typeof storedUser>();
    const secondUpdate = createDeferred<typeof storedUser>();

    vi.mocked(authManager.getAccessToken).mockReturnValue('token');
    vi.mocked(authAPI.getMe).mockResolvedValue(storedUser);
    vi.mocked(authAPI.updateMe)
      .mockImplementationOnce(() => firstUpdate.promise)
      .mockImplementationOnce(() => secondUpdate.promise);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    let firstRequest!: Promise<void>;
    act(() => {
      firstRequest = result.current.setLanguage('en');
    });

    await waitFor(() => {
      expect(result.current.language).toBe('en');
    });

    let secondRequest!: Promise<void>;
    act(() => {
      secondRequest = result.current.setLanguage('ar');
    });

    await waitFor(() => {
      expect(result.current.language).toBe('ar');
    });

    await act(async () => {
      secondUpdate.resolve({ ...storedUser, language: 'ar' });
      await secondRequest;
    });

    expect(result.current.language).toBe('ar');

    await act(async () => {
      firstUpdate.resolve({ ...storedUser, language: 'en' });
      await firstRequest;
    });

    expect(result.current.language).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
  });
});
