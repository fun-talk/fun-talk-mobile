import type { ImageSource } from 'expo-image';
import { localImage } from '@/lib/assets/localImage';

export const loginImages = {
  background: localImage(require('@/assets/images/login/background.png')),
  foxLogin: localImage(require('@/assets/images/login/fox-login.png')),
  foxRegister: localImage(require('@/assets/images/login/fox-register.png')),
  logo: localImage(require('@/assets/images/login/logo.png')),
} as const satisfies Record<string, ImageSource>;
