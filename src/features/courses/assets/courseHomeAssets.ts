import type { ImageSource } from 'expo-image';

import { ossAssets } from '@/lib/assets/ossAssets';

export function getCourseButtonImageSource(completed: boolean): ImageSource {
  return completed
    ? require('@/assets/images/home/button-green.png') as ImageSource
    : require('@/assets/images/home/button-grey.png') as ImageSource;
}

/** Bundled home images + OSS background (too large to ship in app bundle). */
export const courseHomeImages = {
  background: { uri: ossAssets.images.homeBackground },
  studyReport: require('@/assets/images/home/study-report.png') as ImageSource,
  tipBubble: require('@/assets/images/home/group-52.png') as ImageSource,
  stars: require('@/assets/images/home/star-3.png') as ImageSource,
  fox: require('@/assets/images/home/fox.png') as ImageSource,
  continueButton: require('@/assets/images/home/study-button.png') as ImageSource,
} as const satisfies Record<string, ImageSource>;

export const courseHomeLocalImages = {
  buttonGreen: require('@/assets/images/home/button-green.png') as ImageSource,
  buttonGrey: require('@/assets/images/home/button-grey.png') as ImageSource,
  continueButton: require('@/assets/images/home/study-button.png') as ImageSource,
  fox: require('@/assets/images/home/fox.png') as ImageSource,
  stars: require('@/assets/images/home/star-3.png') as ImageSource,
  studyReport: require('@/assets/images/home/study-report.png') as ImageSource,
  tipBubble: require('@/assets/images/home/group-52.png') as ImageSource,
} as const;
