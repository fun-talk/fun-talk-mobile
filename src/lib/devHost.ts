export const ANDROID_EMULATOR_HOST = '10.0.2.2';
export const LOCAL_DEV_HOST = 'localhost';

function rewriteUrlHostname(host: string, nextHostname: string): string {
  try {
    const url = new URL(host);
    url.hostname = nextHostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return host;
  }
}

export function rewriteHostForRuntime(
  host: string,
  platform: string,
  isPhysicalDevice: boolean,
): string {
  if (platform === 'ios' && !isPhysicalDevice) {
    try {
      const url = new URL(host);
      if (url.hostname.endsWith('.local')) {
        return rewriteUrlHostname(host, LOCAL_DEV_HOST);
      }
    } catch {
      // Keep malformed custom hosts unchanged; callers can surface connection errors.
    }
  }

  if (!host.includes(ANDROID_EMULATOR_HOST)) {
    return host;
  }

  if (platform === 'android' && !isPhysicalDevice) {
    return host;
  }

  return host.replaceAll(ANDROID_EMULATOR_HOST, LOCAL_DEV_HOST);
}
