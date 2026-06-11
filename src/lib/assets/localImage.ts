import type { ImageSource } from 'expo-image';

export function localImage(moduleId: number): ImageSource {
  return moduleId as unknown as ImageSource;
}
