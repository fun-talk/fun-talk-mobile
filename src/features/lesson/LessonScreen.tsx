import { useLocalSearchParams } from 'expo-router';

import { LessonWebViewScreen } from './components/LessonWebViewScreen';
import { NativeLessonScreen } from './components/NativeLessonScreen';
import {
  isNativeLessonEnabled,
  resolveLessonRenderMode,
  type LessonModeRouteParams,
} from './lessonMode';

export function LessonScreen() {
  const params = useLocalSearchParams<LessonModeRouteParams>();
  const mode = resolveLessonRenderMode(
    params,
    isNativeLessonEnabled(
      process.env.EXPO_PUBLIC_NATIVE_LESSON_ENABLED ??
        process.env.EXPO_PUBLIC_LESSON_RENDERER,
    ),
  );

  if (mode === 'webview') {
    return <LessonWebViewScreen />;
  }

  return <NativeLessonScreen />;
}
