import Constants from 'expo-constants';

const DEFAULT_API_HOST = 'http://localhost:9000';
const DEFAULT_WEB_BASE_URL = 'http://localhost:19001';
const DEFAULT_OSS_BASE_URL = 'https://fun-talk-file.oss-cn-beijing.aliyuncs.com';
const DEFAULT_WECHAT_APP_ID = 'wx4f3da33035cc1d14';
const DEFAULT_WECHAT_UNIVERSAL_LINK = 'https://ai-fun-talk.com/app/';

function readPublicEnv(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess) {
    return fromProcess;
  }

  const extra = Constants.expoConfig?.extra;
  if (extra && typeof extra[key] === 'string') {
    return extra[key];
  }

  return undefined;
}

export function getApiHost(): string {
  return readPublicEnv('EXPO_PUBLIC_API_HOST') ?? DEFAULT_API_HOST;
}

export function getWebBaseUrl(): string {
  return readPublicEnv('EXPO_PUBLIC_WEB_BASE_URL') ?? DEFAULT_WEB_BASE_URL;
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
