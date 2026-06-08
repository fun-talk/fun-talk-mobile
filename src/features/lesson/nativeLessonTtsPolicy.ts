import type { NativeLessonPhase } from './nativeLessonController';

export function shouldUseServerOnlyTts(phase: NativeLessonPhase | null): boolean {
  return phase === 'free_chat';
}
