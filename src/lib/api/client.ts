import { getDeviceID } from '@/lib/device/deviceId';

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
};

function appendDeviceId(url: URL, deviceId: string) {
  if (!url.searchParams.has('deviceID')) {
    url.searchParams.append('deviceID', deviceId);
  }
}

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const getDeviceId = options.getDeviceId ?? getDeviceID;

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

    const response = await fetch(url.toString(), {
      ...init,
      credentials: 'include',
      headers,
    });

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
