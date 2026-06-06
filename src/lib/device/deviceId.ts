function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import { defaultAsyncStorage, type KeyValueStorage } from '@/lib/storage/asyncStorage';

const DEVICE_ID_KEY = 'funtalk-device-id';

export async function getDeviceID(
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<string> {
  const existing = await storage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = uuidv4();
  await storage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
