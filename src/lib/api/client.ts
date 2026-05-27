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

    const response = await fetch(url.toString(), {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
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
    post: (path, body, init) =>
      request(path, {
        ...init,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
  };
}
