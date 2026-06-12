import type { NativeLessonPhase } from './nativeLessonController';

export const WEB_SPEECH_MAX_ATTEMPTS = 3;

export function shouldAdvanceSpeechStepAfterMaxRetries(params: {
  currentStepPhase: NativeLessonPhase | null;
  inputMode: string | null;
  wrongAttemptCount: number;
  maxAttempts?: number;
}): boolean {
  const maxAttempts = params.maxAttempts ?? WEB_SPEECH_MAX_ATTEMPTS;
  return (
    params.currentStepPhase !== 'free_chat' &&
    params.inputMode === 'speech' &&
    params.wrongAttemptCount >= maxAttempts
  );
}
