import type { RealtimeControlEventData } from './sessionProtocol';

export type LessonMediaCue = {
  cueId: string | null;
  kind: string | null;
  url: string | null;
  description: string | null;
};

export type LessonRuntimeControlContext = {
  currentStepIdRef: { current: number | null };
  currentMediaCueIdRef: { current: string | null };
  setScreenText: (text: string) => void;
  setMessageHint: (text: string) => void;
  setCurrentMedia: (media: LessonMediaCue | null) => void;
};

function readMediaCue(
  media: Record<string, unknown> | null | undefined,
): LessonMediaCue | null {
  if (!media || typeof media !== 'object') {
    return null;
  }
  const url = typeof media.url === 'string' ? media.url : null;
  const kind = typeof media.kind === 'string' ? media.kind : null;
  const cueId = typeof media.cue_id === 'string' ? media.cue_id : null;
  const description =
    typeof media.description === 'string' ? media.description : null;
  if (!url && !kind && !cueId) {
    return null;
  }
  return { cueId, kind, url, description };
}

/**
 * Syncs UI state from server LessonRuntime events.
 * Mirrors fun-talk-web `realtimeConversationV2LessonControlHandlers.ts`.
 */
export function applyLessonRuntimeControlState(
  data: RealtimeControlEventData,
  ctx: LessonRuntimeControlContext,
): void {
  switch (data.event) {
    case 'lesson_state_snapshot': {
      if (typeof data.current_step_id === 'number') {
        ctx.currentStepIdRef.current = data.current_step_id;
      }
      const media = readMediaCue(
        data.current_media as Record<string, unknown> | null | undefined,
      );
      ctx.currentMediaCueIdRef.current = media?.cueId ?? null;
      ctx.setCurrentMedia(media);
      if (typeof data.screen_text === 'string' && data.screen_text.trim()) {
        ctx.setScreenText(data.screen_text);
      }
      return;
    }
    case 'step_started': {
      const step = data.step as
        | {
            step_id?: number;
            screen_text?: string;
            media_cue?: Record<string, unknown> | null;
          }
        | undefined;
      if (step && typeof step.step_id === 'number') {
        ctx.currentStepIdRef.current = step.step_id;
      }
      const media = readMediaCue(step?.media_cue ?? undefined);
      ctx.currentMediaCueIdRef.current = media?.cueId ?? null;
      ctx.setCurrentMedia(media);
      if (step && typeof step.screen_text === 'string' && step.screen_text.trim()) {
        ctx.setScreenText(step.screen_text);
      }
      return;
    }
    case 'answer_evaluated': {
      if (data.feedback_text) {
        ctx.setMessageHint(String(data.feedback_text));
      }
      return;
    }
    case 'media_event': {
      const payload = data.payload as { media_cue?: string } | undefined;
      if (payload && typeof payload.media_cue === 'string') {
        ctx.currentMediaCueIdRef.current = payload.media_cue;
      }
      return;
    }
    case 'lesson_completed': {
      if (data.reason) {
        ctx.setMessageHint(String(data.reason));
      }
      return;
    }
    default:
      return;
  }
}
