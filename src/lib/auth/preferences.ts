import { defaultAsyncStorage, type KeyValueStorage } from '@/lib/storage/asyncStorage';

export const REMEMBER_ME_PREF_KEY = 'ft_remember_me_pref';

export async function readRememberMePreference(
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<boolean> {
  const saved = await storage.getItem(REMEMBER_ME_PREF_KEY);
  if (saved === '0') {
    return false;
  }
  if (saved === '1') {
    return true;
  }
  return true;
}

export async function writeRememberMePreference(
  rememberMe: boolean,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<void> {
  await storage.setItem(REMEMBER_ME_PREF_KEY, rememberMe ? '1' : '0');
}
