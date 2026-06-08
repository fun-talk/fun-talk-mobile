import type { ApiClient } from '@/lib/api/client';
import { withAccessToken } from '@/lib/api/client';
import {
  buildFtAuthFromCheckResponse,
  buildFtAuthFromLoginResponse,
  type LoginSuccessResponse,
  type CheckSessionResponse,
} from '@/lib/auth/session';
import type { FtAuthRecord } from '@/lib/auth/types';

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoginError';
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function getErrorMessage(payload: { detail?: string; message?: string }, fallback: string) {
  return payload.detail || payload.message || fallback;
}

export async function checkSession(
  apiClient: ApiClient,
  previous?: FtAuthRecord | null,
): Promise<FtAuthRecord> {
  const response = await apiClient.get('/api/v1/check');
  if (!response.ok) {
    throw new LoginError('登录已失效，请重新登录');
  }

  const payload = await parseJson<CheckSessionResponse>(response);
  return buildFtAuthFromCheckResponse(payload, previous);
}

export async function loginWithFrontpage(
  apiClient: ApiClient,
  options: {
    mode: 'personal' | 'school';
    payload: Record<string, string>;
    rememberMe: boolean;
  },
): Promise<FtAuthRecord> {
  const params = new URLSearchParams({
    remember_me: options.rememberMe ? 'true' : 'false',
  });

  const response = await apiClient.post(
    `/login/v1/frontpage_login?${params.toString()}`,
    {
      mode: options.mode,
      ...options.payload,
    },
  );

  const data = await parseJson<LoginSuccessResponse & { detail?: string; message?: string }>(
    response,
  );

  if (!response.ok || !data.success) {
    throw new LoginError(getErrorMessage(data, '登录失败，请检查填写内容'));
  }

  return buildFtAuthFromLoginResponse(data, options.rememberMe);
}

export async function registerWechatUser(
  apiClient: ApiClient,
  openid: string,
): Promise<{ name?: string; phone?: string; logo?: string } | null> {
  const response = await apiClient.post('/api/v1/register_user', {
    wechat_openid: openid,
    name: '',
    phone: '',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await parseJson<{ user?: { name?: string; phone?: string; logo?: string } }>(
    response,
  );
  return payload.user ?? null;
}

export async function loginWithWechatCode(
  apiClient: ApiClient,
  code: string,
  rememberMe: boolean,
): Promise<FtAuthRecord> {
  const response = await apiClient.post('/login/v1/wechat/exchange_code', { code });
  const data = await parseJson<LoginSuccessResponse & { detail?: string; message?: string }>(
    response,
  );

  if (!response.ok || !data.token) {
    throw new LoginError(getErrorMessage(data, '微信登录失败，请重试'));
  }

  const authedClient = withAccessToken(apiClient, data.token);

  let auth = buildFtAuthFromLoginResponse(
    {
      token: data.token,
      expires_in: data.expires_in,
      user_info: data.user_info,
    },
    rememberMe,
  );

  if (auth.userId) {
    const registeredUser = await registerWechatUser(authedClient, auth.userId);
    if (registeredUser) {
      const username = registeredUser.name || auth.username || '';
      auth = {
        ...auth,
        username,
        name: username,
        phone: registeredUser.phone || auth.phone,
        logo: registeredUser.logo || auth.logo,
        hasUsername: Boolean(username),
      };
    }
  }

  try {
    auth = await checkSession(authedClient, auth);
  } catch {
    // exchange_code already issued a token; keep mapped auth if check fails transiently.
  }

  return auth;
}

/* ================================================================
 *  WeChat QR Code Scan Login (web OAuth via /wechat/qrcode + /wechat/poll)
 * ================================================================ */

export type QrCodeData = {
  qr_url: string;
  state: string;
  expires_in: number;
};

export type QrPollStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'success';

export type QrPollResult = {
  status: QrPollStatus;
  token?: string;
  expires_in?: number;
  user_info?: { openid?: string; username?: string; avatar?: string };
};

export async function fetchWechatQrCode(apiClient: ApiClient): Promise<QrCodeData> {
  const response = await apiClient.get('/login/v1/wechat/qrcode');
  const data = await parseJson<QrCodeData & { detail?: string }>(response);

  if (!response.ok || !data.qr_url || !data.state) {
    throw new LoginError(data.detail || '获取微信二维码失败');
  }

  return data;
}

export async function pollWechatQrLogin(
  apiClient: ApiClient,
  state: string,
): Promise<QrPollResult> {
  const response = await apiClient.get(`/login/v1/wechat/poll?state=${encodeURIComponent(state)}`);
  return parseJson<QrPollResult>(response);
}

export async function loginWithQrPollResult(
  apiClient: ApiClient,
  pollResult: QrPollResult,
  rememberMe: boolean,
): Promise<FtAuthRecord> {
  if (pollResult.status !== 'success' || !pollResult.token) {
    throw new LoginError('扫码登录未完成');
  }

  const authedClient = withAccessToken(apiClient, pollResult.token);

  let auth = buildFtAuthFromLoginResponse(
    {
      token: pollResult.token,
      expires_in: pollResult.expires_in,
      user_info: pollResult.user_info
        ? {
            openid: pollResult.user_info.openid,
            username: pollResult.user_info.username,
            avatar: pollResult.user_info.avatar,
          }
        : undefined,
    },
    rememberMe,
  );

  if (auth.userId) {
    const registeredUser = await registerWechatUser(authedClient, auth.userId);
    if (registeredUser) {
      const username = registeredUser.name || auth.username || '';
      auth = {
        ...auth,
        username,
        name: username,
        phone: registeredUser.phone || auth.phone,
        logo: registeredUser.logo || auth.logo,
        hasUsername: Boolean(username),
      };
    }
  }

  try {
    auth = await checkSession(authedClient, auth);
  } catch {
    // keep mapped auth if check fails transiently.
  }

  return auth;
}
