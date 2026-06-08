import { useCallback, useEffect, useRef, useState } from 'react';

import type { ApiClient } from '@/lib/api/client';

import {
  fetchWechatQrCode,
  pollWechatQrLogin,
  loginWithQrPollResult,
  type QrPollStatus,
  type QrCodeData,
} from '../services/login';
import type { FtAuthRecord } from '@/lib/auth/types';

export type QrLoginState = {
  /** The URL to render as QR code (WeChat Open Platform OAuth URL) */
  qrUrl: string | null;
  /** Current QR scan status */
  status: 'loading' | QrPollStatus;
  /** Remaining seconds before QR expires */
  expiresIn: number;
};

const POLL_INTERVAL_MS = 2_000;

export function useWechatQrLogin(
  apiClient: ApiClient,
  options: {
    rememberMe: boolean;
    onLoginSuccess: (auth: FtAuthRecord) => void;
    onLoginError: (error: string) => void;
  },
) {
  const [state, setState] = useState<QrLoginState>({
    qrUrl: null,
    status: 'loading',
    expiresIn: 0,
  });

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const stateRef = useRef(state.status);
  stateRef.current = state.status;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    stopPolling();
    stopCountdown();
  }, [stopPolling, stopCountdown]);

  const startCountdown = useCallback(
    (seconds: number) => {
      stopCountdown();
      let remaining = seconds;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, expiresIn: Math.max(0, remaining) }));
        if (remaining <= 0) {
          stopCountdown();
          if (stateRef.current === 'waiting') {
            stopPolling();
            setState((prev) => ({ ...prev, status: 'expired' }));
          }
        }
      }, 1_000);
    },
    [stopCountdown, stopPolling],
  );

  const startPolling = useCallback(
    (qrState: string) => {
      stopPolling();
      pollTimerRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const result = await pollWechatQrLogin(apiClient, qrState);
          if (!mountedRef.current) return;

          if (result.status === 'scanned') {
            setState((prev) => ({ ...prev, status: 'scanned' }));
          } else if (result.status === 'confirmed') {
            setState((prev) => ({ ...prev, status: 'confirmed' }));
          } else if (result.status === 'success') {
            stopAll();
            setState((prev) => ({ ...prev, status: 'success' }));
            // Process the login result
            try {
              const auth = await loginWithQrPollResult(apiClient, result, options.rememberMe);
              if (mountedRef.current) {
                options.onLoginSuccess(auth);
              }
            } catch (err) {
              if (mountedRef.current) {
                options.onLoginError(
                  err instanceof Error ? err.message : '扫码登录失败，请重试',
                );
              }
            }
          } else if (result.status === 'expired') {
            stopAll();
            setState((prev) => ({ ...prev, status: 'expired' }));
          }
        } catch {
          // Transient poll error — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [apiClient, options, stopAll, stopPolling],
  );

  const loadQrCode = useCallback(async () => {
    stopAll();
    setState({ qrUrl: null, status: 'loading', expiresIn: 0 });

    try {
      const data: QrCodeData = await fetchWechatQrCode(apiClient);
      if (!mountedRef.current) return;
      setState({ qrUrl: data.qr_url, status: 'waiting', expiresIn: data.expires_in });
      startCountdown(data.expires_in);
      startPolling(data.state);
    } catch (err) {
      if (!mountedRef.current) return;
      setState({
        qrUrl: null,
        status: 'expired',
        expiresIn: 0,
      });
      options.onLoginError(err instanceof Error ? err.message : '获取二维码失败');
    }
  }, [apiClient, options, startCountdown, startPolling, stopAll]);

  const refresh = useCallback(() => {
    void loadQrCode();
  }, [loadQrCode]);

  // Auto-load on mount
  useEffect(() => {
    mountedRef.current = true;
    void loadQrCode();
    return () => {
      mountedRef.current = false;
      stopAll();
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh };
}
