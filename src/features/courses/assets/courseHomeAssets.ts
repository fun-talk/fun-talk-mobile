import type { ImageSource } from 'expo-image';

import { ossAssets } from '@/lib/assets/ossAssets';

function localImage(moduleId: number): ImageSource {
  return moduleId as unknown as ImageSource;
}

export function getCourseButtonImageSource(completed: boolean): ImageSource {
  return completed
    ? localImage(require('@/assets/images/home/button-green.png'))
    : localImage(require('@/assets/images/home/button-grey.png'));
}

/** Bundled home images + OSS background (too large to ship in app bundle). */
export const courseHomeImages = {
  background: { uri: ossAssets.images.homeBackground },
  studyReport: localImage(require('@/assets/images/home/study-report.png')),
  tipBubble: localImage(require('@/assets/images/home/group-52.png')),
  stars: localImage(require('@/assets/images/home/star-3.png')),
  fox: localImage(require('@/assets/images/home/fox.png')),
  continueButton: localImage(require('@/assets/images/home/study-button.png')),
} as const satisfies Record<string, ImageSource>;

export const courseHomeLocalImages = {
  buttonGreen: localImage(require('@/assets/images/home/button-green.png')),
  buttonGrey: localImage(require('@/assets/images/home/button-grey.png')),
  continueButton: localImage(require('@/assets/images/home/study-button.png')),
  fox: localImage(require('@/assets/images/home/fox.png')),
  stars: localImage(require('@/assets/images/home/star-3.png')),
  studyReport: localImage(require('@/assets/images/home/study-report.png')),
  tipBubble: localImage(require('@/assets/images/home/group-52.png')),
} as const;
