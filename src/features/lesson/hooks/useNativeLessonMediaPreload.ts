import { Asset } from 'expo-asset';
import { useEffect } from 'react';

export function useNativeLessonMediaPreload(uris: string[]) {
  useEffect(() => {
    let cancelled = false;

    async function preload() {
      await Promise.allSettled(
        uris.map(async (uri) => {
          if (cancelled) {
            return;
          }
          await Asset.fromURI(uri).downloadAsync();
        }),
      );
    }

    preload();

    return () => {
      cancelled = true;
    };
  }, [uris]);
}

