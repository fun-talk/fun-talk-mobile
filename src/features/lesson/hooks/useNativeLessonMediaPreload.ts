import { Asset } from 'expo-asset';
import { useEffect } from 'react';

const preloadedUris = new Set<string>();
const MAX_PRELOAD_URIS = 3;

export function useNativeLessonMediaPreload(uris: string[]) {
  useEffect(() => {
    let cancelled = false;
    const pendingUris = uris
      .filter((uri) => uri.trim().length > 0 && !preloadedUris.has(uri))
      .slice(0, MAX_PRELOAD_URIS);

    async function preload() {
      await Promise.allSettled(
        pendingUris.map(async (uri) => {
          if (cancelled) {
            return;
          }
          await Asset.fromURI(uri).downloadAsync();
          preloadedUris.add(uri);
        }),
      );
    }

    preload();

    return () => {
      cancelled = true;
    };
  }, [uris]);
}
