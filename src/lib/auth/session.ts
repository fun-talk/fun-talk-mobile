import type { FtAuthRecord } from './types';

export type LoginUserInfo = {
  openid?: string;
  username?: string;
  phone?: string;
  avatar?: string;
  auth_type?: string;
};

export type LoginSuccessResponse = {
  success?: boolean;
  token?: string;
  expires_in?: number;
  remember_me?: boolean;
  user_info?: LoginUserInfo;
};

export type CheckSessionResponse = {
  code?: number;
  token?: string;
  expires_in?: number;
  user_info?: LoginUserInfo;
};

const PERSISTENT_AUTH_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_AUTH_MS = 24 * 60 * 60 * 1000;

export function buildFtAuthFromLoginResponse(
  data: LoginSuccessResponse,
  rememberMe: boolean,
): FtAuthRecord {
  const user = data.user_info ?? {};
  const expiresInMs =
    Number(data.expires_in) > 0
      ? Number(data.expires_in) * 1000
      : rememberMe
        ? PERSISTENT_AUTH_MS
        : SESSION_AUTH_MS;

  const username = user.username || '';
  return {
    userId: user.openid || '',
    token: data.token || '',
    hasUsername: Boolean(username),
    username,
    name: username,
    phone: user.phone || '',
    logo: user.avatar || '',
    authType: user.auth_type || '',
    persistent: rememberMe,
    expiresAt: Date.now() + expiresInMs,
  };
}

export function buildFtAuthFromCheckResponse(
  data: CheckSessionResponse,
  previous?: FtAuthRecord | null,
): FtAuthRecord {
  const user = data.user_info ?? {};
  const rememberMe = previous?.persistent ?? true;
  const expiresInMs =
    Number(data.expires_in) > 0
      ? Number(data.expires_in) * 1000
      : rememberMe
        ? PERSISTENT_AUTH_MS
        : SESSION_AUTH_MS;
  const username = user.username || previous?.username || '';

  return {
    userId: user.openid || previous?.userId || '',
    token: data.token || previous?.token || '',
    hasUsername: Boolean(username),
    username,
    name: username,
    phone: user.phone || previous?.phone || '',
    logo: user.avatar || previous?.logo || '',
    authType: previous?.authType || '',
    persistent: rememberMe,
    expiresAt: Date.now() + expiresInMs,
  };
}

export function mergeAuthRecord(
  base: FtAuthRecord,
  patch: Partial<FtAuthRecord>,
): FtAuthRecord {
  return { ...base, ...patch };
}
