import type { ImageSource } from 'expo-image';

import { ossAssets } from '@/lib/assets/ossAssets';

function localImage(moduleId: number): ImageSource {
  return moduleId as unknown as ImageSource;
}

export const loginImages = {
  background: { uri: ossAssets.images.loginBackground },
  foxLogin: localImage(require('@/assets/images/login/fox-login.png')),
  foxRegister: localImage(require('@/assets/images/login/fox-register.png')),
  logo: localImage(require('@/assets/images/login/logo.png')),
} as const satisfies Record<string, ImageSource>;
