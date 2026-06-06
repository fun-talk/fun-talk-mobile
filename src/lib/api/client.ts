import { getDeviceID } from '@/lib/device/deviceId';

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export class ApiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export type ApiClient = {
  baseUrl: string;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  get: (path: string, init?: RequestInit) => Promise<Response>;
  post: (path: string, body?: unknown, init?: RequestInit) => Promise<Response>;
};

export type CreateApiClientOptions = {
  baseUrl: string;
  getDeviceId?: () => Promise<string>;
  getAccessToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  requestTimeoutMs?: number;
};

function appendDeviceId(url: URL, deviceId: string) {
  if (!url.searchParams.has('deviceID')) {
    url.searchParams.append('deviceID', deviceId);
  }
}

function buildNetworkErrorMessage(baseUrl: string, error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return `连接超时，请确认后端已启动且 EXPO_PUBLIC_API_HOST 配置正确（当前：${baseUrl}）`;
  }

  return `无法连接服务器，请确认后端已启动且 EXPO_PUBLIC_API_HOST 配置正确（当前：${baseUrl}）`;
}

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const getDeviceId = options.getDeviceId ?? getDeviceID;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  async function request(path: string, init?: RequestInit): Promise<Response> {
    const url = new URL(path, options.baseUrl);
    appendDeviceId(url, await getDeviceId());

    const headers = new Headers(init?.headers ?? {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const accessToken = options.getAccessToken ? await options.getAccessToken() : null;
    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        ...init,
        credentials: 'include',
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      throw new ApiRequestError(buildNetworkErrorMessage(options.baseUrl, error));
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 && options.onUnauthorized) {
      options.onUnauthorized();
    }

    return response;
  }

  return {
    baseUrl: options.baseUrl,
    request,
    get: (path, init) => request(path, { ...init, method: 'GET' }),
    post: (path, body, init) => {
      const headers = new Headers(init?.headers ?? {});
      if (body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      return request(path, {
        ...init,
        method: 'POST',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
  };
}

export function withAccessToken(apiClient: ApiClient, token: string): ApiClient {
  return createApiClient({
    baseUrl: apiClient.baseUrl,
    getAccessToken: () => token,
  });
}
