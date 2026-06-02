export { buildNativeLessonPath } from '@/shared/courseOpeningSceneEntry';
export { LessonScreen } from './LessonScreen';
export { NativeLessonScreen } from './components/NativeLessonScreen';
export {
  buildNativeLessonFallbackPath,
  isNativeLessonEnabled,
  resolveLessonRenderMode,
  type LessonRenderMode,
} from './lessonMode';
export {
  buildNativeRealtimeLessonPath,
  fetchNativeLessonDefinition,
  getNativeLessonRequestFromParams,
  normalizeNativeLessonDefinition,
} from './nativeLessonLoader';
export { computeNativeLessonLayout } from './nativeLessonLayout';
export { resolveNativeLessonOpeningPreview } from './nativeLessonPreview';
export {
  buildNativeLessonControllerItems,
  createNativeLessonControllerState,
  getNativeLessonControllerView,
  reduceNativeLessonController,
} from './nativeLessonController';
export { NativeLessonShell } from './components/NativeLessonShell';
export { CourseMediaArea } from './components/CourseMediaArea';
export { RecordingPanel } from './components/RecordingPanel';
export { useNativeLessonController } from './hooks/useNativeLessonController';
export { useNativeLessonMediaPreload } from './hooks/useNativeLessonMediaPreload';
export { useNativeLessonRecording } from './hooks/useNativeLessonRecording';
export { useNativeLessonScale } from './hooks/useNativeLessonScale';
export type {
  NativeLessonChallenge,
  NativeLessonDefinition,
  NativeLessonMetadata,
  NativeLessonRouteRequest,
  NativeLessonStep,
} from './nativeLessonTypes';
