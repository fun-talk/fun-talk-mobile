import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { createMemoryStorage } from '@/lib/storage/asyncStorage';

import {
  clearFtAuthFromStores,
  getFtAuthFromStores,
  setFtAuthToStores,
  type TokenStore,
} from './storageCore';

function createMemoryTokenStore(storage: ReturnType<typeof createMemoryStorage>): TokenStore {
  return {
    get: () => storage.getItem('ft_auth_token'),
    set: async (value) => {
      if (value) {
        await storage.setItem('ft_auth_token', value);
        return;
      }
      await storage.removeItem('ft_auth_token');
    },
  };
}

describe('auth storage core', () => {
  const storage = createMemoryStorage();
  const tokenStore = createMemoryTokenStore(storage);

  beforeEach(async () => {
    await clearFtAuthFromStores(tokenStore, storage);
  });

  it('returns null when no auth is stored', async () => {
    assert.equal(await getFtAuthFromStores(tokenStore, storage), null);
  });

  it('persists and reads auth profile with token split across stores', async () => {
    await setFtAuthToStores(
      {
        userId: 'user-1',
        token: 'secret-token',
        username: '小明',
        name: '小明',
        hasUsername: true,
        persistent: true,
      },
      tokenStore,
      storage,
    );

    assert.deepEqual(await getFtAuthFromStores(tokenStore, storage), {
      userId: 'user-1',
      token: 'secret-token',
      username: '小明',
      name: '小明',
      hasUsername: true,
      persistent: true,
    });
  });

  it('clears stored auth', async () => {
    await setFtAuthToStores({ token: 'secret-token', userId: 'user-1' }, tokenStore, storage);
    await clearFtAuthFromStores(tokenStore, storage);
    assert.equal(await getFtAuthFromStores(tokenStore, storage), null);
  });
});
