import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { defaultAsyncStorage, type KeyValueStorage } from '@/lib/storage/asyncStorage';

import type { FtAuthRecord } from './types';
import {
  clearFtAuthFromStores,
  getFtAuthFromStores,
  setFtAuthToStores,
  type TokenStore,
} from './storageCore';

const FT_AUTH_TOKEN_KEY = 'ft_auth_token';
const FT_AUTH_PROFILE_KEY = 'ft_auth_profile';

function createTokenStore(storage: KeyValueStorage = defaultAsyncStorage): TokenStore {
  if (Platform.OS === 'web') {
    return {
      get: () => storage.getItem(FT_AUTH_TOKEN_KEY),
      set: async (value) => {
        if (value) {
          await storage.setItem(FT_AUTH_TOKEN_KEY, value);
          return;
        }
        await storage.removeItem(FT_AUTH_TOKEN_KEY);
      },
    };
  }

  return {
    get: async () => {
      try {
        return await SecureStore.getItemAsync(FT_AUTH_TOKEN_KEY);
      } catch {
        return storage.getItem(FT_AUTH_TOKEN_KEY);
      }
    },
    set: async (value) => {
      if (!value) {
        try {
          await SecureStore.deleteItemAsync(FT_AUTH_TOKEN_KEY);
        } catch {
          // fall through
        }
        await storage.removeItem(FT_AUTH_TOKEN_KEY);
        return;
      }

      try {
        await SecureStore.setItemAsync(FT_AUTH_TOKEN_KEY, value);
      } catch {
        await storage.setItem(FT_AUTH_TOKEN_KEY, value);
      }
    },
  };
}

export async function getFtAuth(
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<FtAuthRecord | null> {
  return getFtAuthFromStores(createTokenStore(storage), storage);
}

export async function setFtAuth(
  auth: FtAuthRecord,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<void> {
  await setFtAuthToStores(auth, createTokenStore(storage), storage);
}

export async function clearFtAuth(
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<void> {
  await clearFtAuthFromStores(createTokenStore(storage), storage);
}

export { FT_AUTH_PROFILE_KEY, FT_AUTH_TOKEN_KEY };
