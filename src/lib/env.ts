import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { rewriteHostForRuntime } from '@/lib/devHost';

const DEFAULT_API_HOST = 'http://localhost:9000';
const DEFAULT_WEB_BASE_URL = 'http://localhost:19001';
const DEFAULT_OSS_BASE_URL = 'https://fun-talk-file.oss-cn-beijing.aliyuncs.com';
const DEFAULT_WECHAT_APP_ID = 'wx4f3da33035cc1d14';
const DEFAULT_WECHAT_UNIVERSAL_LINK = 'https://ai-fun-talk.com/app/';

type PublicEnvKey =
  | 'EXPO_PUBLIC_API_HOST'
  | 'EXPO_PUBLIC_WEB_BASE_URL'
  | 'EXPO_PUBLIC_ASSET_BASE_URL'
  | 'EXPO_PUBLIC_OSS_BASE_URL'
  | 'EXPO_PUBLIC_WECHAT_APP_ID'
  | 'EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK'
  | 'EXPO_PUBLIC_LESSON_RENDERER'
  | 'EXPO_PUBLIC_NATIVE_LESSON_ENABLED';

function readProcessEnv(key: PublicEnvKey): string | undefined {
  switch (key) {
    case 'EXPO_PUBLIC_API_HOST':
      return process.env.EXPO_PUBLIC_API_HOST;
    case 'EXPO_PUBLIC_WEB_BASE_URL':
      return process.env.EXPO_PUBLIC_WEB_BASE_URL;
    case 'EXPO_PUBLIC_ASSET_BASE_URL':
      return process.env.EXPO_PUBLIC_ASSET_BASE_URL;
    case 'EXPO_PUBLIC_OSS_BASE_URL':
      return process.env.EXPO_PUBLIC_OSS_BASE_URL;
    case 'EXPO_PUBLIC_WECHAT_APP_ID':
      return process.env.EXPO_PUBLIC_WECHAT_APP_ID;
    case 'EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK':
      return process.env.EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK;
    case 'EXPO_PUBLIC_LESSON_RENDERER':
      return process.env.EXPO_PUBLIC_LESSON_RENDERER;
    case 'EXPO_PUBLIC_NATIVE_LESSON_ENABLED':
      return process.env.EXPO_PUBLIC_NATIVE_LESSON_ENABLED;
  }
}

function readPublicEnv(key: PublicEnvKey): string | undefined {
  const fromProcess = readProcessEnv(key);
  if (fromProcess) {
    return fromProcess;
  }

  const extra = Constants.expoConfig?.extra;
  if (extra && typeof extra[key] === 'string') {
    return extra[key];
  }

  return undefined;
}

function resolveRuntimeHost(configured: string | undefined, fallback: string): string {
  const host = configured ?? fallback;
  return rewriteHostForRuntime(host, Platform.OS, Device.isDevice);
}

export function getApiHost(): string {
  return resolveRuntimeHost(readPublicEnv('EXPO_PUBLIC_API_HOST'), DEFAULT_API_HOST);
}

export function getWebBaseUrl(): string {
  return resolveRuntimeHost(readPublicEnv('EXPO_PUBLIC_WEB_BASE_URL'), DEFAULT_WEB_BASE_URL);
}

export function getAssetBaseUrl(): string {
  return readPublicEnv('EXPO_PUBLIC_ASSET_BASE_URL') ?? getWebBaseUrl();
}

export function getOssBaseUrl(): string {
  return readPublicEnv('EXPO_PUBLIC_OSS_BASE_URL') ?? DEFAULT_OSS_BASE_URL;
}

export function getWechatAppId(): string {
  return readPublicEnv('EXPO_PUBLIC_WECHAT_APP_ID') ?? DEFAULT_WECHAT_APP_ID;
}

export function getWechatUniversalLink(): string {
  return readPublicEnv('EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK') ?? DEFAULT_WECHAT_UNIVERSAL_LINK;
}

export type LessonRenderer = 'webview' | 'native';

export function getLessonRenderer(): LessonRenderer {
  const renderer = readPublicEnv('EXPO_PUBLIC_LESSON_RENDERER')?.toLowerCase();
  if (renderer === 'webview') {
    return 'webview';
  }
  if (renderer === 'native') {
    return 'native';
  }

  const legacyNativeEnabled = readPublicEnv('EXPO_PUBLIC_NATIVE_LESSON_ENABLED');
  if (legacyNativeEnabled === '0' || legacyNativeEnabled === 'false') {
    return 'webview';
  }

  return 'native';
}
