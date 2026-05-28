import type { FtAuthRecord } from '@/lib/auth/types';

export async function syncWebViewAuthCookies(
  _apiHost: string,
  _auth: FtAuthRecord | null,
): Promise<void> {}

export async function clearWebViewAuthCookies(_apiHost: string): Promise<void> {}
