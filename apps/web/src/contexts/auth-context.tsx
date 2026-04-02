import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { authAPI } from '@/services/api';
import type { AuthFlowResponse, AuthUser, LoginRequest, RegisterRequest } from '@/services/api';
import * as authManager from '@/services/auth-manager';
import * as kycSessionManager from '@/services/kyc-session-manager';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  language: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
}

export interface AuthContextValue extends AuthState {
  login(this: void, credentials: LoginRequest): Promise<{ status: 'authenticated' | 'pending_kyc' }>;
  register(this: void, data: RegisterRequest): Promise<{ status: 'authenticated' | 'pending_kyc' }>;
  logout(this: void): void;
  updateUser(this: void, user: AuthUser): void;
  setLanguage(this: void, language: 'ar' | 'en'): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const LANGUAGE_STORAGE_KEY = 'hena-wadeena:language';

function normalizeLanguage(language?: string | null): 'ar' | 'en' {
  return language === 'en' ? 'en' : 'ar';
}

function getStoredLanguage(): 'ar' | 'en' {
  if (typeof window === 'undefined') {
    return 'ar';
  }

  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function isPendingKycResponse(
  response: AuthFlowResponse,
): response is Extract<AuthFlowResponse, { status: 'pending_kyc' }> {
  return 'status' in response && response.status === 'pending_kyc';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [languagePreference, setLanguagePreference] = useState<'ar' | 'en'>(getStoredLanguage);
  const languageRequestIdRef = useRef(0);
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
        setLanguagePreference(normalizeLanguage(currentUser.language));
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
    languageRequestIdRef.current += 1;
    const rt = authManager.getRefreshToken();
    void authAPI.logout(rt ?? undefined).catch(() => undefined);
    authManager.clearTokens();
    kycSessionManager.clearKycSessionToken();
    setUser(null);
    void navigate('/login');
  }, [navigate]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authAPI.login(credentials);
    if (isPendingKycResponse(response)) {
      authManager.clearTokens();
      kycSessionManager.setKycSessionToken(response.kyc_session_token);
      setUser(null);
      return { status: 'pending_kyc' } as const;
    } else {
      kycSessionManager.clearKycSessionToken();
      authManager.setTokens(response.access_token, response.refresh_token);
      setUser(response.user);
      setLanguagePreference(normalizeLanguage(response.user.language));
      return { status: 'authenticated' } as const;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authAPI.register(data);
    if (isPendingKycResponse(response)) {
      authManager.clearTokens();
      kycSessionManager.setKycSessionToken(response.kyc_session_token);
      setUser(null);
      return { status: 'pending_kyc' } as const;
    } else {
      kycSessionManager.clearKycSessionToken();
      authManager.setTokens(response.access_token, response.refresh_token);
      setUser(response.user);
      setLanguagePreference(normalizeLanguage(response.user.language));
      return { status: 'authenticated' } as const;
    }
  }, []);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
    setLanguagePreference(normalizeLanguage(updatedUser.language));
  }, []);

  const setLanguage = useCallback(
    async (nextLanguage: 'ar' | 'en') => {
      const normalizedLanguage = normalizeLanguage(nextLanguage);
      const previousLanguage = normalizeLanguage(user?.language ?? languagePreference);

      if (user?.language === normalizedLanguage) {
        setLanguagePreference(normalizedLanguage);
        return;
      }

      const requestId = languageRequestIdRef.current + 1;
      languageRequestIdRef.current = requestId;
      setLanguagePreference(normalizedLanguage);

      if (!user) {
        return;
      }

      const previousUser = user;
      setUser({ ...user, language: normalizedLanguage });

      try {
        const updatedUser = await authAPI.updateMe({ language: normalizedLanguage });
        if (languageRequestIdRef.current !== requestId) {
          return;
        }
        setUser(updatedUser);
        setLanguagePreference(normalizeLanguage(updatedUser.language));
      } catch (error) {
        if (languageRequestIdRef.current !== requestId) {
          return;
        }
        setUser(previousUser);
        setLanguagePreference(previousLanguage);
        throw error;
      }
    },
    [languagePreference, user],
  );

  const language = normalizeLanguage(user?.language ?? languagePreference);
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [direction, language]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      language,
      direction,
      login,
      register,
      logout,
      updateUser,
      setLanguage,
    }),
    [user, isLoading, language, direction, login, register, logout, updateUser, setLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
