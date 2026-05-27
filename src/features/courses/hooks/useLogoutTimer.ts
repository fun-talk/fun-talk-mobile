import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { ApiClient } from '@/lib/api/client';

import { shouldForceLogout } from '../services/courseHomeApi';

export function useLogoutTimer(apiClient: ApiClient, onLogout: () => void, intervalMs = 60_000) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkAndHandleLogout = async () => {
      const shouldLogout = await shouldForceLogout(apiClient);
      if (shouldLogout) {
        onLogout();
      }
    };

    void checkAndHandleLogout();
    timerRef.current = setInterval(checkAndHandleLogout, intervalMs);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkAndHandleLogout();
      }
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      subscription.remove();
    };
  }, [apiClient, intervalMs, onLogout]);
}
