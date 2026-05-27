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
import { getApiHost } from '@/lib/env';

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
  const logoutRef = useRef<() => Promise<void>>(async () => {});

  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: getApiHost(),
        onUnauthorized: () => {
          void logoutRef.current();
        },
      }),
    [],
  );

  const refreshAuth = useCallback(async () => {
    const nextAuth = await getFtAuth();
    setAuthState(nextAuth);
    return nextAuth;
  }, []);

  const saveAuth = useCallback(async (nextAuth: FtAuthRecord) => {
    await setFtAuth(nextAuth);
    setAuthState(nextAuth);
  }, []);

  const logout = useCallback(async () => {
    await clearFtAuth();
    setAuthState(null);
  }, []);

  logoutRef.current = logout;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await refreshAuth();
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
  }, [refreshAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isLoading,
      isAuthenticated: Boolean(auth),
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
