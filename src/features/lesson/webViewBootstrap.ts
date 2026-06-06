import type { FtAuthRecord } from '@/lib/auth/types';

type BootstrapOptions = {
  auth: FtAuthRecord;
  deviceId: string;
  apiHost: string;
};

export function buildWebViewBootstrapScript(options: BootstrapOptions): string {
  const authPayload = JSON.stringify({
    userId: options.auth.userId || '',
    token: options.auth.token || '',
    hasUsername: options.auth.hasUsername ?? false,
    username: options.auth.username || '',
    name: options.auth.name || options.auth.username || '',
    phone: options.auth.phone || '',
    logo: options.auth.logo || '',
    authType: options.auth.authType || '',
    persistent: options.auth.persistent ?? true,
    expiresAt: options.auth.expiresAt,
  });

  return `
(function () {
  try {
    var auth = ${authPayload};
    var deviceId = ${JSON.stringify(options.deviceId)};
    var token = ${JSON.stringify(options.auth.token || '')};
    localStorage.setItem('ft_auth', JSON.stringify(auth));
    localStorage.setItem('funtalk-device-id', deviceId);

    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      init = init || {};
      var headers = new Headers(init.headers || {});
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer ' + token);
      }

      var requestUrl = typeof input === 'string'
        ? input
        : (input && input.url ? input.url : '');

      if (requestUrl && requestUrl.indexOf('deviceID=') === -1) {
        var joiner = requestUrl.indexOf('?') === -1 ? '?' : '&';
        var nextUrl = requestUrl + joiner + 'deviceID=' + encodeURIComponent(deviceId);
        if (typeof input === 'string') {
          input = nextUrl;
        } else if (input && input.url) {
          input = new Request(nextUrl, input);
        }
      }

      init.headers = headers;
      if (!init.credentials) {
        init.credentials = 'include';
      }
      return nativeFetch(input, init);
    };

    window.__FUNTALK_NATIVE_BRIDGE__ = true;
  } catch (error) {
    console.warn('native bootstrap failed', error);
  }
})();
true;
`;
}
