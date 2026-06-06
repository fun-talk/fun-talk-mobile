import type { FtAuthRecord } from '@/lib/auth/types';

export async function syncWebViewAuthCookies(
  _apiHost: string,
  _auth: FtAuthRecord | null,
): Promise<void> {
  // Web preview does not use native WebView cookies.
}

export async function clearWebViewAuthCookies(_apiHost: string): Promise<void> {
  // no-op on web
}
