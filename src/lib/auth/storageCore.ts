import type { KeyValueStorage } from '@/lib/storage/asyncStorage';

import { isAuthExpired, parseFtAuthProfile, type FtAuthRecord } from './types';

export type TokenStore = {
  get: () => Promise<string | null>;
  set: (value: string | null) => Promise<void>;
};

export async function getFtAuthFromStores(
  tokenStore: TokenStore,
  profileStorage: KeyValueStorage,
): Promise<FtAuthRecord | null> {
  const [token, profileRaw] = await Promise.all([
    tokenStore.get(),
    profileStorage.getItem('ft_auth_profile'),
  ]);

  const profile = parseFtAuthProfile(profileRaw);
  if (!profile && !token) {
    return null;
  }

  const auth: FtAuthRecord = {
    ...profile,
    token: token ?? undefined,
  };

  if (isAuthExpired(auth)) {
    await clearFtAuthFromStores(tokenStore, profileStorage);
    return null;
  }

  return auth;
}

export async function setFtAuthToStores(
  auth: FtAuthRecord,
  tokenStore: TokenStore,
  profileStorage: KeyValueStorage,
): Promise<void> {
  const { token, ...profile } = auth;

  await Promise.all([
    tokenStore.set(token ?? null),
    profileStorage.setItem('ft_auth_profile', JSON.stringify(profile)),
  ]);
}

export async function clearFtAuthFromStores(
  tokenStore: TokenStore,
  profileStorage: KeyValueStorage,
): Promise<void> {
  await Promise.all([tokenStore.set(null), profileStorage.removeItem('ft_auth_profile')]);
}
