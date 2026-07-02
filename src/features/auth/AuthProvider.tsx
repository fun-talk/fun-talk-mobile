import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { createApiClient, type ApiClient } from '@/lib/api/client';
import { clearFtAuth, getFtAuth, setFtAuth } from '@/lib/auth/storage';
import type { FtAuthRecord } from '@/lib/auth/types';
import { buildFtAuthFromAccountSession } from '@/lib/auth/session';
import { getApiHost } from '@/lib/env';
import { checkSession } from '@/features/auth/services/login';
import { fetchAccountSession } from '@/features/auth/services/accountApi';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden during fast refresh.
});

type AuthContextValue = {
  auth: FtAuthRecord | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  apiClient: ApiClient;
  refreshAuth: () => Promise<FtAuthRecord | null>;
  saveAuth: (auth: FtAuthRecord) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuthState] = useState<FtAuthRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRef = useRef<FtAuthRecord | null>(null);
  const logoutRef = useRef<() => Promise<void>>(async () => {});

  authRef.current = auth;

  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: getApiHost(),
        getAccessToken: () => authRef.current?.token ?? null,
        onUnauthorized: () => {
          void logoutRef.current();
        },
      }),
    [],
  );

  const refreshAuth = useCallback(async () => {
    const nextAuth = await getFtAuth();
    setAuthState(nextAuth);
    authRef.current = nextAuth;
    return nextAuth;
  }, []);

  const saveAuth = useCallback(async (nextAuth: FtAuthRecord) => {
    await setFtAuth(nextAuth);
    setAuthState(nextAuth);
    authRef.current = nextAuth;
  }, []);

  const logout = useCallback(async () => {
    await clearFtAuth();
    setAuthState(null);
    authRef.current = null;
  }, []);

  logoutRef.current = logout;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await getFtAuth();
        if (!stored?.token) {
          if (stored) {
            await clearFtAuth();
          }
          if (!cancelled) {
            setAuthState(null);
            authRef.current = null;
          }
          return;
        }

        authRef.current = stored;
        if (!cancelled) {
          setAuthState(stored);
        }

        try {
          // Try new account v1 session first (for accounts created via new login flow)
          if (stored.accountType) {
            const accountSession = await fetchAccountSession(apiClient);
            const verified = buildFtAuthFromAccountSession(
              accountSession.account_type,
              accountSession.student?.digital_id,
              accountSession.home?.phone,
              stored,
              accountSession.teacher,
            );
            await setFtAuth(verified);
            if (!cancelled) {
              setAuthState(verified);
              authRef.current = verified;
            }
          } else {
            // Fall back to legacy session check
            const verified = await checkSession(apiClient, stored);
            await setFtAuth(verified);
            if (!cancelled) {
              setAuthState(verified);
              authRef.current = verified;
            }
          }
        } catch {
          // If new session check fails but we have legacy auth, try legacy
          if (stored.accountType) {
            try {
              const verified = await checkSession(apiClient, stored);
              await setFtAuth(verified);
              if (!cancelled) {
                setAuthState(verified);
                authRef.current = verified;
              }
              return;
            } catch {
              // both failed, clear
            }
          }
          await clearFtAuth();
          if (!cancelled) {
            setAuthState(null);
            authRef.current = null;
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          await SplashScreen.hideAsync();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isLoading,
      isAuthenticated: Boolean(auth?.token),
      apiClient,
      refreshAuth,
      saveAuth,
      logout,
    }),
    [apiClient, auth, isLoading, logout, refreshAuth, saveAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
