import type {
  NativeLessonControllerView,
  NativeLessonLifecycle,
  NativeLessonPhase,
} from './nativeLessonController';
import type { NativeLessonStep } from './nativeLessonTypes';
import type {
  RealtimeLessonEvent,
  RealtimeLessonStepPayload,
} from './nativeLessonSessionProtocol';

export type RealtimeLessonProjectionState = {
  connected: boolean;
  sessionId: string | null;
  lastEvent: RealtimeLessonEvent | null;
  currentStep: RealtimeLessonStepPayload | null;
  currentLifecycle: string | null;
  snapshot: Extract<RealtimeLessonEvent, { event: 'lesson_state_snapshot' }> | null;
  answer?: {
    itemId: string;
    selectedOptionId?: string;
    submittedText?: string;
    correct: boolean;
    feedbackText: string;
  };
  completed: boolean;
  errorText: string;
};

export const INITIAL_REALTIME_LESSON_PROJECTION_STATE: RealtimeLessonProjectionState = {
  connected: false,
  sessionId: null,
  lastEvent: null,
  currentStep: null,
  currentLifecycle: null,
  snapshot: null,
  answer: undefined,
  completed: false,
  errorText: '',
};

function normalizePhase(phase: string): NativeLessonPhase {
  if (phase === 'story' || phase === 'teaching' || phase === 'challenge' || phase === 'free_chat') {
    return phase;
  }
  return 'challenge';
}

function normalizeLifecycle(lifecycle: string): NativeLessonLifecycle {
  if (
    lifecycle === 'pending' ||
    lifecycle === 'assistant_turn' ||
    lifecycle === 'waiting_user' ||
    lifecycle === 'waiting_media' ||
    lifecycle === 'transitioning' ||
    lifecycle === 'completed'
  ) {
    return lifecycle;
  }
  if (lifecycle === 'evaluating') {
    return 'waiting_user';
  }
  return 'pending';
}

function mediaFromStep(step: RealtimeLessonStepPayload | null) {
  if (!step?.mediaCue?.url) {
    return null;
  }
  return {
    type: step.mediaCue.kind || 'video',
    url: step.mediaCue.url,
  };
}

function stepFromRealtime(step: RealtimeLessonStepPayload | null): NativeLessonStep | undefined {
  if (!step) {
    return undefined;
  }
  return {
    step: step.stepId,
    promptText: step.assistantPrompt,
    screenText: step.screenText || step.screenTextFallback,
    mediaCueId: step.mediaCue?.cueId,
    responseMode: step.inputMode === 'choice' ? 'choice' : step.inputMode === 'speech' ? 'speech' : undefined,
    correctOptionId: step.correctOptionId,
    expectedPhrases: step.expectedPhrases,
    successReply: step.successReply || undefined,
    retryText: step.retryText || undefined,
    options: step.choiceOptions.map((option) => ({
      id: option.optionId,
      label: option.label,
      text: option.text,
      ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
    })),
    autoAdvance: step.advancePolicy === 'auto',
    raw: {},
  };
}

export function applyRealtimeLessonEvent(
  state: RealtimeLessonProjectionState,
  event: RealtimeLessonEvent,
): RealtimeLessonProjectionState {
  if (event.event === 'session_ready') {
    return {
      ...state,
      connected: true,
      sessionId: event.sessionId ?? state.sessionId,
      lastEvent: event,
      errorText: '',
    };
  }
  if (event.event === 'lesson_state_snapshot') {
    return {
      ...state,
      snapshot: event,
      lastEvent: event,
      currentLifecycle: event.lifecycle,
      answer: undefined,
      completed: event.lifecycle === 'completed' ? true : state.completed,
      errorText: '',
    };
  }
  if (event.event === 'step_started') {
    return {
      ...state,
      currentStep: event.step,
      currentLifecycle: event.lifecycle,
      lastEvent: event,
      answer: undefined,
      errorText: '',
    };
  }
  if (event.event === 'user_turn_opened') {
    return {
      ...state,
      lastEvent: event,
      currentLifecycle: 'waiting_user',
      answer: undefined,
      errorText: '',
    };
  }
  if (
    event.event === 'assistant_message' ||
    event.event === 'assistant_speech_start' ||
    event.event === 'chat' ||
    event.event === 'chat_ended'
  ) {
    return {
      ...state,
      lastEvent: event,
      currentStep: state.currentStep
        ? { ...state.currentStep, assistantPrompt: event.text || state.currentStep.assistantPrompt }
        : state.currentStep,
    };
  }
  if (event.event === 'answer_evaluated') {
    return {
      ...state,
      lastEvent: event,
      answer: {
        itemId: `realtime:${event.stepId}`,
        selectedOptionId: event.matchedOptionId,
        correct: event.correct,
        feedbackText: event.feedbackText,
      },
    };
  }
  if (event.event === 'lesson_completed') {
    return {
      ...state,
      lastEvent: event,
      completed: true,
    };
  }
  if (event.event === 'error') {
    return {
      ...state,
      lastEvent: event,
      errorText: event.message,
    };
  }
  return {
    ...state,
    lastEvent: event,
  };
}

export function getRealtimeControllerView(
  state: RealtimeLessonProjectionState,
  fallback: { title: string; backgroundImageUrl?: string },
): NativeLessonControllerView | null {
  const step = state.currentStep;
  const snapshot = state.snapshot;
  const stepId = snapshot?.currentStepId ?? step?.stepId;
  if (!snapshot && !step && !state.completed) {
    return null;
  }
  const phase = normalizePhase(snapshot?.phase ?? step?.phase ?? 'challenge');
  const lifecycle = normalizeLifecycle(
    state.completed ? 'completed' : snapshot?.lifecycle ?? state.currentLifecycle ?? 'pending',
  );
  const media =
    snapshot?.currentMedia?.url
      ? { type: snapshot.currentMedia.kind || 'video', url: snapshot.currentMedia.url }
      : mediaFromStep(step);
  const nativeStep = stepFromRealtime(step);
  const snapshotOptions = snapshot?.choiceOptions.length
    ? snapshot.choiceOptions.map((option) => ({
      id: option.optionId,
      label: option.label,
      text: option.text,
      ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
    }))
    : [];
  const renderedStep =
    nativeStep ??
    (snapshotOptions.length || snapshot?.inputMode === 'speech'
      ? {
          step: stepId ?? 0,
          promptText: snapshot?.screenText || '',
          screenText: snapshot?.screenText || '',
          responseMode:
            snapshot?.inputMode === 'choice'
              ? 'choice'
              : snapshot?.inputMode === 'speech'
                ? 'speech'
                : undefined,
          options: snapshotOptions,
          autoAdvance: false,
          raw: {},
        }
      : undefined);
  if (renderedStep && snapshotOptions.length) {
    renderedStep.options = snapshotOptions;
  }

  return {
    id: stepId ? `realtime:${stepId}` : 'realtime:end',
    phase: state.completed ? 'end' : phase,
    title: fallback.title,
    text: step?.assistantPrompt || snapshot?.screenText || (state.completed ? '课程完成' : fallback.title),
    screenText: snapshot?.screenText || step?.screenText || step?.screenTextFallback || '',
    backgroundImageUrl: fallback.backgroundImageUrl || '',
    media,
    step: renderedStep,
    lifecycle,
    isPaused: false,
    index: Math.max(0, (stepId ?? 1) - 1),
    total: Math.max(
      snapshot?.totalSteps ?? 0,
      stepId ?? 1,
      snapshot?.completedStepIds.length ?? 0,
      1,
    ),
    canGoNext: !state.completed,
    answer: state.answer,
  };
}
