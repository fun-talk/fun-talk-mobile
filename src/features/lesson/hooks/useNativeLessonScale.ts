import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { computeNativeLessonLayout, type NativeLessonLayout } from '../nativeLessonLayout';

export function useNativeLessonScale(): NativeLessonLayout {
  const dimensions = useWindowDimensions();
  return useMemo(
    () => computeNativeLessonLayout(dimensions),
    [dimensions],
  );
}
