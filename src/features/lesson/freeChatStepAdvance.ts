import type { NativeLessonPhase } from './nativeLessonController';

export function shouldAdvanceFreeChatStepOnClose(
  event: { event: string; intent?: string },
  currentStepPhase: NativeLessonPhase | null,
): boolean {
  return (
    event.event === 'chat_ended' &&
    event.intent === 'close' &&
    currentStepPhase === 'free_chat'
  );
}
