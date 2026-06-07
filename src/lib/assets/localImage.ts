import { Image as RNImage } from 'react-native';
import type { ImageSource } from 'expo-image';

export function localImage(moduleId: number): ImageSource {
  return RNImage.resolveAssetSource(moduleId) as unknown as ImageSource;
}
