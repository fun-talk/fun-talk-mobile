export const ANDROID_EMULATOR_HOST = '10.0.2.2';
export const LOCAL_DEV_HOST = 'localhost';

export function rewriteHostForRuntime(
  host: string,
  platform: string,
  isPhysicalDevice: boolean,
): string {
  if (!host.includes(ANDROID_EMULATOR_HOST)) {
    return host;
  }

  if (platform === 'android' && !isPhysicalDevice) {
    return host;
  }

  return host.replaceAll(ANDROID_EMULATOR_HOST, LOCAL_DEV_HOST);
}
