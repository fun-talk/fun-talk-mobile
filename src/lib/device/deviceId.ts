import { defaultAsyncStorage, type KeyValueStorage } from '@/lib/storage/asyncStorage';

const DEVICE_ID_KEY = 'funtalk-device-id';

function randomHex(length: number): string {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += Math.floor(Math.random() * 16).toString(16);
  }
  return value;
}

function createDeviceId(): string {
  return [
    Date.now().toString(16),
    randomHex(8),
    randomHex(8),
    randomHex(8),
  ].join('-');
}

export async function getDeviceID(
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<string> {
  const existing = await storage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = createDeviceId();
  await storage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
