import Constants from 'expo-constants';

const DEFAULT_API_HOST = 'http://localhost:9000';
const DEFAULT_WEB_BASE_URL = 'http://localhost:5173';

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
