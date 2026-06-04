import { unpackRealtimeWireFrame } from './nativeRealtimeAudio';

export type RealtimeLessonMediaCue = {
  cueId: string;
  kind: string;
  description?: string;
  url?: string;
} | null;

export type RealtimeLessonChoiceOption = {
  optionId: string;
  label: string;
  text: string;
  imageUrl?: string;
};

export type RealtimeLessonStepPayload = {
  stepId: number;
  phase: string;
  assistantPrompt: string;
  inputMode: string;
  advancePolicy: string;
  expectedPhrases: string[];
  choiceOptions: RealtimeLessonChoiceOption[];
  correctOptionId?: string;
  mediaCue?: RealtimeLessonMediaCue;
  screenText: string;
  screenTextFallback: string;
  successReply: string;
  retryText: string;
};

export type RealtimeLessonEvent =
  | {
      event: 'session_ready';
      sessionId?: string;
      resumed?: boolean;
      useLessonRuntime?: boolean;
    }
  | {
      event: 'lesson_state_snapshot';
      phase: string;
      currentStepId?: number;
      lifecycle: string;
      inputMode: string;
      userTurnOpen: boolean;
      currentMedia: RealtimeLessonMediaCue;
      screenText: string;
      choiceOptions: RealtimeLessonChoiceOption[];
      completedStepIds: number[];
      totalSteps?: number;
    }
  | {
      event: 'step_started';
      step: RealtimeLessonStepPayload;
      lifecycle: string;
    }
  | {
      event: 'assistant_message' | 'assistant_speech_start';
      text: string;
      intent?: string;
    }
  | { event: 'assistant_speech_end' }
  | { event: 'tts_start' | 'tts_end' }
  | { event: 'user_turn_opened'; stepId?: number; inputMode: string }
  | { event: 'user_transcript_partial' | 'user_transcript_final'; text: string }
  | {
      event: 'answer_evaluated';
      stepId: number;
      correct: boolean;
      matchedPhrase?: string;
      matchedOptionId?: string;
      feedbackText: string;
    }
  | { event: 'media_event'; kind: string; payload: Record<string, unknown> }
  | { event: 'step_completed'; stepId: number; advanced: boolean }
  | { event: 'lesson_completed'; reason: string }
  | { event: 'error'; message: string };

export type InitSessionCommandOptions = {
  lessonId?: string;
  sectionId?: string;
  token?: string | null;
  resumeSessionId?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item).trim()).filter(Boolean)
    : [];
}

function normalizeMediaCue(value: unknown): RealtimeLessonMediaCue {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = asRecord(value);
  const cueId = asString(raw.cue_id || raw.cueId).trim();
  if (!cueId) {
    return null;
  }
  const url = asString(raw.url).trim();
  const description = asString(raw.description).trim();
  return {
    cueId,
    kind: asString(raw.kind, 'video').trim() || 'video',
    ...(description ? { description } : {}),
    ...(url ? { url } : {}),
  };
}

function normalizeChoiceOptions(value: unknown): RealtimeLessonChoiceOption[] {
  return Array.isArray(value)
    ? value
        .map((item) => asRecord(item))
        .map((raw) => {
          const optionId = asString(raw.option_id || raw.optionId || raw.id).trim();
          const label = asString(raw.label, optionId).trim();
          const text = asString(raw.text, label).trim();
          const imageUrl = asString(raw.image_url || raw.imageUrl).trim();
          return {
            optionId,
            label,
            text,
            ...(imageUrl ? { imageUrl } : {}),
          };
        })
        .filter((option) => option.optionId)
    : [];
}

function normalizeStepPayload(value: unknown): RealtimeLessonStepPayload {
  const raw = asRecord(value);
  const stepId = asNumber(raw.step_id || raw.stepId) ?? 0;
  return {
    stepId,
    phase: asString(raw.phase, 'challenge'),
    assistantPrompt: asString(raw.assistant_prompt || raw.assistantPrompt),
    inputMode: asString(raw.input_mode || raw.inputMode, 'none'),
    advancePolicy: asString(raw.advance_policy || raw.advancePolicy, 'auto'),
    expectedPhrases: asStringArray(raw.expected_phrases || raw.expectedPhrases),
    choiceOptions: normalizeChoiceOptions(raw.choice_options || raw.choiceOptions),
    correctOptionId: asString(raw.correct_option_id || raw.correctOptionId).trim() || undefined,
    mediaCue: normalizeMediaCue(raw.media_cue || raw.mediaCue),
    screenText: asString(raw.screen_text || raw.screenText),
    screenTextFallback: asString(raw.screen_text_fallback || raw.screenTextFallback),
    successReply: asString(raw.success_reply || raw.successReply),
    retryText: asString(raw.retry_text || raw.retryText),
  };
}

export function buildInitSessionCommand(options: InitSessionCommandOptions) {
  const sectionId = Number(options.sectionId);
  return {
    type: 'init' as const,
    system_role: '你是一个热情友好的AI语音助手',
    agent_prompt_template: 'template_2',
    bot_name: '欧波',
    speaking_style: '活泼、鼓励式、儿童友好',
    speaker: 'zh_female_vv_jupiter_bigtts',
    tts_speed: 1,
    use_frontend_tts: false,
    use_lesson_runtime: true,
    skip_opening_message: true,
    ...(options.lessonId ? { lesson_id: options.lessonId } : {}),
    ...(Number.isFinite(sectionId) ? { section_id: sectionId } : {}),
    ...(options.resumeSessionId ? { resume_session_id: options.resumeSessionId } : {}),
    allow_owner_resume: true,
  };
}

export function buildStartLessonCommand() {
  return { type: 'START_LESSON' as const };
}

export function buildSubmitUserTextCommand(text: string, stepId?: number) {
  return {
    type: 'SUBMIT_USER_TEXT' as const,
    text,
    ...(typeof stepId === 'number' ? { step_id: stepId } : {}),
  };
}

export function buildSubmitChoiceCommand(stepId: number, optionId: string) {
  return {
    type: 'SUBMIT_CHOICE' as const,
    step_id: stepId,
    option_id: optionId,
  };
}

export function buildMediaFinishedCommand(args: { cueId?: string; summary?: string } = {}) {
  return {
    type: 'MEDIA_FINISHED' as const,
    ...(args.cueId ? { cue_id: args.cueId } : {}),
    summary: args.summary || '',
  };
}

export function buildAssistantPromptSpokenCommand(stepId: number) {
  return {
    type: 'ASSISTANT_PROMPT_SPOKEN' as const,
    step_id: stepId,
  };
}

export function buildRealtimeLessonWsUrl(
  apiBaseUrl: string,
  deviceId: string,
  token: string | null,
): string {
  const url = new URL('/ws/realtime', apiBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('deviceID', deviceId);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

export async function decodeRealtimeLessonMessage(data: unknown): Promise<Record<string, unknown> | null> {
  const wireFrame = unpackRealtimeWireFrame(data);
  if (wireFrame?.kind === 'json') {
    return wireFrame.payload;
  }
  if (wireFrame?.kind === 'audio') {
    return null;
  }

  let text = '';
  if (typeof data === 'string') {
    text = data;
  } else if (data instanceof ArrayBuffer) {
    text = new TextDecoder().decode(data);
  } else if (ArrayBuffer.isView(data)) {
    text = new TextDecoder().decode(data);
  } else if (
    data &&
    typeof data === 'object' &&
    typeof (data as { text?: unknown }).text === 'function'
  ) {
    text = await (data as { text: () => Promise<string> }).text();
  }

  if (!text.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return asRecord(parsed);
  } catch {
    return null;
  }
}

export function normalizeRealtimeLessonEvent(payload: unknown): RealtimeLessonEvent | null {
  const raw = asRecord(payload);
  const event = asString(raw.event).trim();
  if (!event) {
    return null;
  }

  if (event === 'session_ready') {
    return {
      event,
      sessionId: asString(raw.session_id || raw.sessionId).trim() || undefined,
      resumed: raw.resumed === true,
      useLessonRuntime: raw.use_lesson_runtime === true || raw.useLessonRuntime === true,
    };
  }
  if (event === 'lesson_state_snapshot') {
    const completedStepIdsRaw = raw.completed_step_ids || raw.completedStepIds;
    return {
      event,
      phase: asString(raw.phase, 'challenge'),
      currentStepId: asNumber(raw.current_step_id || raw.currentStepId),
      lifecycle: asString(raw.lifecycle, 'pending'),
      inputMode: asString(raw.input_mode || raw.inputMode, 'none'),
      userTurnOpen: raw.user_turn_open === true || raw.userTurnOpen === true,
      currentMedia: normalizeMediaCue(raw.current_media || raw.currentMedia),
      screenText: asString(raw.screen_text || raw.screenText),
      choiceOptions: normalizeChoiceOptions(raw.choice_options || raw.choiceOptions),
      completedStepIds: Array.isArray(completedStepIdsRaw)
        ? completedStepIdsRaw
            .map((step) => asNumber(step))
            .filter((step): step is number => typeof step === 'number')
        : [],
      totalSteps: asNumber(raw.total_steps || raw.totalSteps),
    };
  }
  if (event === 'step_started') {
    return {
      event,
      step: normalizeStepPayload(raw.step),
      lifecycle: asString(raw.lifecycle, 'pending'),
    };
  }
  if (event === 'assistant_message' || event === 'assistant_speech_start') {
    return {
      event,
      text: asString(raw.text),
      intent: asString(raw.intent).trim() || undefined,
    };
  }
  if (event === 'assistant_speech_end') {
    return { event };
  }
  if (event === 'tts_start' || event === 'tts_end') {
    return { event };
  }
  if (event === 'user_turn_opened') {
    return {
      event,
      stepId: asNumber(raw.step_id || raw.stepId),
      inputMode: asString(raw.input_mode || raw.inputMode, 'none'),
    };
  }
  if (event === 'user_transcript_partial' || event === 'user_transcript_final') {
    return { event, text: asString(raw.text) };
  }
  if (event === 'answer_evaluated') {
    return {
      event,
      stepId: asNumber(raw.step_id || raw.stepId) ?? 0,
      correct: raw.correct === true,
      matchedPhrase: asString(raw.matched_phrase || raw.matchedPhrase).trim() || undefined,
      matchedOptionId:
        asString(raw.matched_option_id || raw.matchedOptionId).trim() || undefined,
      feedbackText: asString(raw.feedback_text || raw.feedbackText),
    };
  }
  if (event === 'media_event') {
    return { event, kind: asString(raw.kind), payload: asRecord(raw.payload) };
  }
  if (event === 'step_completed') {
    return {
      event,
      stepId: asNumber(raw.step_id || raw.stepId) ?? 0,
      advanced: raw.advanced === true,
    };
  }
  if (event === 'lesson_completed') {
    return { event, reason: asString(raw.reason, 'finished') };
  }
  if (event === 'error') {
    return { event, message: asString(raw.message, 'Realtime session error') };
  }

  return null;
}
