import type { ImageSource } from 'expo-image';
import { resolveOssAsset } from '@/lib/assets/ossAssets';

/**
 * Login screen assets — aligned with web PR#179 accountAssets.ts.
 *
 * Web OSS URLs:
 *   ACCOUNT_LOGIN_BACKGROUND_URL → images/uploads/2026/06/22/login-background-180932.png
 *   ACCOUNT_LOGIN_LOGO_URL       → images/uploads/2026/06/22/login-logo-180818.png
 *
 * We keep the local fox images as fallback; the background and logo
 * use the same OSS-hosted assets as the web project.
 */
export const loginImages = {
  /** Full-screen background — same OSS asset as web AccountBackground. */
  background: resolveOssAsset('images/uploads/2026/06/22/login-background-180932.png') as unknown as ImageSource,
  /** Brand logo — same OSS asset as web FoxAvatar. */
  logo: resolveOssAsset('images/uploads/2026/06/22/login-logo-180818.png') as unknown as ImageSource,
  /** Landing page fox mascot (local). */
  foxLogin: require('@/assets/images/login/fox-login.png') as ImageSource,
  /** Register page fox mascot (local). */
  foxRegister: require('@/assets/images/login/fox-register.png') as ImageSource,
} as const satisfies Record<string, ImageSource>;
