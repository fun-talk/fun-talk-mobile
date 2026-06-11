import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import type { ImageSource } from 'expo-image';

export function localImage(moduleId: number): ImageSource {
  return resolveAssetSource(moduleId) as unknown as ImageSource;
}
