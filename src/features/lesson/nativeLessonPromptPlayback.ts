import type { RealtimeLessonStepPayload } from './nativeLessonSessionProtocol';
import type { NativeLessonStep } from './nativeLessonTypes';

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

export function resolveStepAnswerFeedbackPlaybackPlan(
  step: Pick<NativeLessonStep, 'successVoiceUrl' | 'retryVoiceUrl' | 'successReply'>,
  correct: boolean,
): StepPromptPlaybackPlan {
  if (correct) {
    const successVoiceUrl = step.successVoiceUrl?.trim();
    if (successVoiceUrl) {
      return { kind: 'remote_url', voiceUrl: successVoiceUrl };
    }
    const successReply = step.successReply?.trim();
    if (successReply) {
      return { kind: 'tts', text: successReply };
    }
    return { kind: 'mark_spoken' };
  }

  const retryVoiceUrl = step.retryVoiceUrl?.trim();
  if (retryVoiceUrl) {
    return { kind: 'remote_url', voiceUrl: retryVoiceUrl };
  }
  return { kind: 'mark_spoken' };
}

export type ControllerItemPromptSource = {
  text: string;
  voiceUrl?: string;
  mediaDescriptionVoiceUrl?: string;
  step?: Pick<NativeLessonStep, 'promptText' | 'voiceUrl'>;
};

export function resolveControllerItemPromptPlaybackPlans(
  item: ControllerItemPromptSource,
): StepPromptPlaybackPlan[] {
  const assistantPrompt = item.step?.promptText?.trim() || item.text.trim();
  const voiceUrl = item.step?.voiceUrl?.trim() || item.voiceUrl?.trim();
  const plans: StepPromptPlaybackPlan[] = [];
  const primary = resolveStepPromptPlaybackPlan({ assistantPrompt, voiceUrl });

  if (primary.kind !== 'mark_spoken') {
    plans.push(primary);
  }

  const mediaDescriptionVoiceUrl = item.mediaDescriptionVoiceUrl?.trim();
  if (mediaDescriptionVoiceUrl) {
    plans.push({ kind: 'remote_url', voiceUrl: mediaDescriptionVoiceUrl });
  }

  if (plans.length === 0) {
    plans.push(primary);
  }

  return plans;
}
