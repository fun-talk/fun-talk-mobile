import { v4 as uuidv4 } from 'uuid';

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
