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

/* ================================================================
 *  New Account v1 session builders (aligned with web PR#179)
 * ================================================================ */

/**
 * Build FtAuthRecord from /account/v1/student/login response.
 */
export function buildFtAuthFromStudentLogin(
  token: string,
  expiresIn: number,
  digitalId: string,
  persistent: boolean,
): FtAuthRecord {
  const expiresInMs = expiresIn > 0 ? expiresIn * 1000 : PERSISTENT_AUTH_MS;
  return {
    userId: digitalId,
    token,
    username: digitalId,
    name: digitalId,
    accountType: 'school_student',
    authType: 'student',
    persistent,
    expiresAt: Date.now() + expiresInMs,
    hasUsername: false,
    phone: '',
    logo: '',
  };
}

/**
 * Build FtAuthRecord from /account/v1/home/phone/login or /account/v1/home/wechat/login response.
 */
export function buildFtAuthFromHomeLogin(
  token: string,
  expiresIn: number,
  phone: string,
  wechatOpenid: string,
  persistent: boolean,
): FtAuthRecord {
  const expiresInMs = expiresIn > 0 ? expiresIn * 1000 : PERSISTENT_AUTH_MS;
  const userId = wechatOpenid || phone;
  return {
    userId,
    token,
    username: phone || wechatOpenid,
    name: phone || wechatOpenid,
    phone,
    accountType: 'home_account',
    authType: 'home',
    persistent,
    expiresAt: Date.now() + expiresInMs,
    hasUsername: false,
    logo: '',
  };
}

/**
 * Build FtAuthRecord from /account/v1/session response.
 */
export function buildFtAuthFromAccountSession(
  accountType: string,
  studentDigitalId?: string,
  homePhone?: string | null,
  previous?: FtAuthRecord | null,
): FtAuthRecord {
  const persistent = previous?.persistent ?? true;
  const expiresInMs = previous?.expiresAt
    ? previous.expiresAt - Date.now()
    : PERSISTENT_AUTH_MS;

  if (accountType === 'student') {
    const id = studentDigitalId || previous?.userId || '';
    return {
      userId: id,
      token: previous?.token || '',
      username: id,
      name: id,
      accountType: 'school_student',
      authType: 'student',
      persistent,
      expiresAt: Date.now() + expiresInMs,
      hasUsername: false,
      phone: previous?.phone || '',
      logo: previous?.logo || '',
    };
  }

  // home account
  const phone = homePhone || previous?.phone || '';
  return {
    userId: previous?.userId || phone,
    token: previous?.token || '',
    username: phone,
    name: phone,
    phone,
    accountType: 'home_account',
    authType: 'home',
    persistent,
    expiresAt: Date.now() + expiresInMs,
    hasUsername: false,
    logo: previous?.logo || '',
  };
}

export function mergeAuthRecord(
  base: FtAuthRecord,
  patch: Partial<FtAuthRecord>,
): FtAuthRecord {
  return { ...base, ...patch };
}
