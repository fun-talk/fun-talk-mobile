import { getOssBaseUrl } from '@/lib/env';

function joinOssPath(path: string): string {
  const base = getOssBaseUrl().replace(/\/$/, '');
  const normalized = path.replace(/^\//, '');
  return `${base}/${normalized}`;
}

/** Remote-only assets hosted on OSS (large backgrounds, lesson media, etc.). */
export const ossAssets = {
  images: {
    homeBackground: joinOssPath('images/home/background.png'),
    loginBackground: joinOssPath('images/login/background.png'),
    /** Web PR#179 login background — same asset as web AccountBackground. */
    loginBackgroundV1: joinOssPath('images/uploads/2026/06/22/login-background-180932.png'),
    /** Web PR#179 brand logo — same asset as web FoxAvatar. */
    loginLogoV1: joinOssPath('images/uploads/2026/06/22/login-logo-180818.png'),
  },
  sounds: {
    onboardingGreeting:
      'https://fun-talk-file.oss-cn-beijing.aliyuncs.com/sounds/common/audio-1759132604701.wav',
  },
} as const;

export function resolveOssAsset(path: string): string {
  return joinOssPath(path);
}
