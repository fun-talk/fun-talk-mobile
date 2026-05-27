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
