import type { RealtimeLessonStepPayload } from './nativeLessonSessionProtocol';

export type StepPromptPlaybackPlan =
  | { kind: 'remote_url'; voiceUrl: string }
  | { kind: 'tts'; text: string }
  | { kind: 'mark_spoken' };

export function resolveStepPromptPlaybackPlan(
  step: Pick<RealtimeLessonStepPayload, 'assistantPrompt' | 'voiceUrl'>,
): StepPromptPlaybackPlan {
  const voiceUrl = step.voiceUrl?.trim();
  if (voiceUrl) {
    return { kind: 'remote_url', voiceUrl };
  }

  const assistantPrompt = step.assistantPrompt.trim();
  if (assistantPrompt) {
    return { kind: 'tts', text: assistantPrompt };
  }

  return { kind: 'mark_spoken' };
}
