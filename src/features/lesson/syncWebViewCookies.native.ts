import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { FtAuthRecord } from '@/lib/auth/types';

type CookieOptions = {
  name: string;
  value: string;
  path: string;
  version: string;
  secure: boolean;
  httpOnly: boolean;
  expires?: string;
  domain?: string;
};

type CookieManagerModule = {
  set: (url: string, cookie: CookieOptions) => Promise<boolean>;
  clearByName: (url: string, name: string) => Promise<boolean>;
  flush: () => Promise<void>;
};

let cookieManagerPromise: Promise<CookieManagerModule | null> | null = null;

function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function loadCookieManager(): Promise<CookieManagerModule | null> {
  if (isRunningInExpoGo()) {
    return null;
  }

  if (!cookieManagerPromise) {
    cookieManagerPromise = import('@react-native-cookies/cookies')
      .then((module) => module.default as CookieManagerModule)
      .catch(() => null);
  }

  return cookieManagerPromise;
}

function resolveCookieDomain(apiHost: string): string | undefined {
  try {
    const hostname = new URL(apiHost).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return undefined;
    }
    return hostname;
  } catch {
    return undefined;
  }
}

export async function syncWebViewAuthCookies(
  apiHost: string,
  auth: FtAuthRecord | null,
): Promise<void> {
  if (!auth?.token) {
    return;
  }

  const CookieManager = await loadCookieManager();
  if (!CookieManager) {
    return;
  }

  try {
    const secure = apiHost.startsWith('https://');
    const expires =
      auth.expiresAt && auth.expiresAt > Date.now()
        ? new Date(auth.expiresAt).toISOString()
        : undefined;

    await CookieManager.set(apiHost, {
      name: 'sid',
      value: auth.token,
      path: '/',
      version: '1',
      secure,
      httpOnly: true,
      expires,
      domain: resolveCookieDomain(apiHost),
    });

    if (Platform.OS === 'android') {
      await CookieManager.flush();
    }
  } catch (error) {
    console.warn('syncWebViewAuthCookies failed:', error);
  }
}

export async function clearWebViewAuthCookies(apiHost: string): Promise<void> {
  const CookieManager = await loadCookieManager();
  if (!CookieManager) {
    return;
  }

  try {
    await CookieManager.clearByName(apiHost, 'sid');
    if (Platform.OS === 'android') {
      await CookieManager.flush();
    }
  } catch {
    // Cookie manager may be unavailable in Expo Go or incomplete native builds.
  }
}
