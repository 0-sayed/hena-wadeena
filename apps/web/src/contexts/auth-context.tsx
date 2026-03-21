import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authAPI, registerUnauthorizedCallback } from '@/services/api';
import type { AuthUser, LoginRequest, RegisterRequest } from '@/services/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login(credentials: LoginRequest): Promise<void>;
  register(data: RegisterRequest): Promise<void>;
  logout(): void;
  updateUser(user: AuthUser): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  token: 'access_token',
  user: 'user',
} as const;

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount, then validate with server
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.token);

      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      // Show cached user immediately for fast UI
      const cached = getStoredUser();
      if (cached && !cancelled) setUser(cached);

      try {
        const currentUser = await authAPI.getMe();
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
        setUser(currentUser);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    void authAPI.logout().catch(() => undefined);
    clearAuth();
  }, [clearAuth]);

  // Register 401 handler (uses clearAuth, not logout, to avoid calling /auth/logout on expired tokens)
  useEffect(() => {
    registerUnauthorizedCallback(clearAuth);
  }, [clearAuth]);

  const storeAuth = useCallback((token: string, authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const response = await authAPI.login(credentials);
      storeAuth(response.access_token, response.user);
    },
    [storeAuth],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const response = await authAPI.register(data);
      storeAuth(response.access_token, response.user);
    },
    [storeAuth],
  );

  const updateUser = useCallback((updatedUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, isLoading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
