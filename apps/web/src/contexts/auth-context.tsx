import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { authAPI } from '@/services/api';
import type { AuthUser, LoginRequest, RegisterRequest } from '@/services/api';
import * as authManager from '@/services/auth-manager';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login(this: void, credentials: LoginRequest): Promise<void>;
  register(this: void, data: RegisterRequest): Promise<void>;
  logout(this: void): void;
  updateUser(this: void, user: AuthUser): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Hydrate from localStorage on mount, then validate with server
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const token = authManager.getAccessToken();

      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authAPI.getMe();
        if (cancelled) return;
        setUser(currentUser);
      } catch {
        if (cancelled) return;
        authManager.clearTokens();
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

  const logout = useCallback(() => {
    const rt = authManager.getRefreshToken();
    void authAPI.logout(rt ?? undefined).catch(() => undefined);
    authManager.clearTokens();
    setUser(null);
    void navigate('/login');
  }, [navigate]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authAPI.login(credentials);
    authManager.setTokens(response.access_token, response.refresh_token);
    const currentUser = await authAPI.getMe();
    setUser(currentUser);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authAPI.register(data);
    authManager.setTokens(response.access_token, response.refresh_token);
    const currentUser = await authAPI.getMe();
    setUser(currentUser);
  }, []);

  const updateUser = useCallback((updatedUser: AuthUser) => {
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
