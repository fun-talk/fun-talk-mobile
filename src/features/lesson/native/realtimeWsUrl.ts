import { getDeviceID } from '@/lib/device/deviceId';

export type BuildRealtimeLessonWsUrlOptions = {
  speaker: string;
  deviceId?: string;
  /** Bearer token for realtime WS auth when native cookies are unavailable. */
  accessToken?: string;
};

/**
 * Builds the FunTalk realtime lesson WebSocket URL.
 * Must target `/ws/realtime` — the server returns HTTP 403 for `/`.
 */
export async function buildRealtimeLessonWsUrl(
  apiOrWsHost: string,
  options: BuildRealtimeLessonWsUrlOptions,
): Promise<string> {
  const trimmed = apiOrWsHost.trim().replace(/\/$/, '');
  const wsOrigin = trimmed.replace(/^http/i, 'ws');
  const deviceId = options.deviceId?.trim() || (await getDeviceID());
  const params = new URLSearchParams();
  params.set('deviceID', deviceId);
  params.set('speaker', options.speaker);
  const token = options.accessToken?.trim();
  if (token) {
    params.set('token', token);
  }
  return `${wsOrigin}/ws/realtime?${params.toString()}`;
}
