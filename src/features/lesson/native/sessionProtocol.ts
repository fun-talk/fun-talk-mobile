/**
 * Realtime session protocol: command builders and event normalization.
 * Ported from fun-talk-web: realtimeConversationV2SessionProtocol.ts
 */

import type { FreeChatConfig } from "./lessonDefinition";

// ---------------------------------------------------------------------------
// Control event data
// ---------------------------------------------------------------------------

export interface RealtimeControlEventData {
  event: string;
  text?: string;
  intent?: string;
  message?: string;
  utterance_id?: number;
  transition_index?: number;
  session_id?: string;
  resumed?: boolean;
  step_payload?: Record<string, unknown>;
  step?: number;
  matched?: boolean;
  response_mode?: string;
  reason?: string;
  kind?: string;
  payload?: Record<string, unknown>;
  from_step?: number;
  to_step?: number;
  use_lesson_runtime?: boolean;
  lesson?: Record<string, unknown>;
  current_step_id?: number;
  current_media?: Record<string, unknown> | null;
  feedback_text?: string;
  screen_text?: string;
  phase?: string;
  lifecycle?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Init session command
// ---------------------------------------------------------------------------

export interface BuildInitSessionCommandOptions {
  systemRole: string;
  agentPromptTemplate: string;
  botName: string;
  speaker: string;
  ttsSpeed: number;
  useFrontendTts: boolean;
  asrEndSmoothWindowMs?: number;
  speakingStyle?: string;
  resumeSessionId?: string;
  allowOwnerResume?: boolean;
  skipOpeningMessage?: boolean;
  freeChatConfig?: FreeChatConfig;
  freeChatOpeningQuestionAlreadyAsked?: boolean;
  /** When true, server loads lesson from DB/seed and uses LessonRuntime. */
  useLessonRuntime?: boolean;
  lessonId?: string;
  lessonKey?: string;
  versionId?: number;
  sectionId?: number;
}

function buildFreeChatSessionInit(
  config: FreeChatConfig,
  opts: { openingQuestionAlreadyAsked: boolean },
): Record<string, unknown> {
  return {
    free_chat_enabled: true,
    free_chat_opening: config.openingQuestion,
    free_chat_topic_mode: config.topicMode,
    free_chat_min_user_turns: config.minUserTurns ?? 2,
    free_chat_max_user_turns: config.maxUserTurns ?? 4,
    free_chat_return_hint: config.returnHint ?? "",
    free_chat_context_summary: config.contextSummary ?? "",
    free_chat_opening_question_already_asked:
      opts.openingQuestionAlreadyAsked,
  };
}

export function buildInitSessionCommand(
  options: BuildInitSessionCommandOptions,
): Record<string, unknown> {
  return {
    type: "init",
    system_role: options.systemRole,
    agent_prompt_template: options.agentPromptTemplate,
    bot_name: options.botName,
    speaking_style: options.speakingStyle || "活泼、鼓励式、儿童友好",
    speaker: options.speaker,
    tts_speed: options.ttsSpeed,
    use_frontend_tts: options.useFrontendTts,
    ...(options.useLessonRuntime === true
      ? { use_lesson_runtime: true }
      : {}),
    ...(options.lessonId ? { lesson_id: options.lessonId } : {}),
    ...(options.lessonKey ? { lesson_key: options.lessonKey } : {}),
    ...(typeof options.versionId === "number"
      ? { version_id: options.versionId }
      : {}),
    ...(typeof options.sectionId === "number"
      ? { section_id: options.sectionId }
      : {}),
    ...(typeof options.asrEndSmoothWindowMs === "number" &&
    Number.isFinite(options.asrEndSmoothWindowMs) &&
    options.asrEndSmoothWindowMs > 0
      ? {
          asr_end_smooth_window_ms: Math.floor(
            options.asrEndSmoothWindowMs,
          ),
        }
      : {}),
    ...(options.resumeSessionId
      ? { resume_session_id: options.resumeSessionId }
      : {}),
    ...(options.allowOwnerResume === undefined
      ? {}
      : { allow_owner_resume: options.allowOwnerResume }),
    ...(options.skipOpeningMessage
      ? { skip_opening_message: true }
      : {}),
    ...(options.freeChatConfig
      ? buildFreeChatSessionInit(options.freeChatConfig, {
          openingQuestionAlreadyAsked:
            options.freeChatOpeningQuestionAlreadyAsked === true,
        })
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Outgoing command builders
// ---------------------------------------------------------------------------

export function buildTriggerStepPromptCommand(text = "继续下一步") {
  return {
    type: "TRIGGER_STEP_PROMPT",
    payload: { text },
  };
}

export function buildDebugForceNextStepCommand() {
  return { type: "DEBUG_FORCE_NEXT_STEP" };
}

export function buildVideoPlayFinishedCommand(summary: string) {
  return {
    type: "VIDEO_PLAY_FINISHED",
    payload: { summary },
  };
}

export function buildStartLessonCommand() {
  return { type: "START_LESSON" as const };
}

export function buildMediaFinishedCommand(
  args: { cueId?: string; summary?: string } = {},
) {
  return {
    type: "MEDIA_FINISHED" as const,
    ...(args.cueId ? { cue_id: args.cueId } : {}),
    summary: args.summary || "",
  };
}

export function buildAssistantPromptSpokenCommand(stepId: number) {
  return {
    type: "ASSISTANT_PROMPT_SPOKEN" as const,
    step_id: stepId,
  };
}

export function buildSubmitChoiceCommand(stepId: number, optionId: string) {
  return {
    type: "SUBMIT_CHOICE" as const,
    step_id: stepId,
    option_id: optionId,
  };
}

// ---------------------------------------------------------------------------
// Event normalization
// ---------------------------------------------------------------------------

export function normalizeRealtimeControlEvent(
  payload: unknown,
): RealtimeControlEventData | null {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const event = String(raw.event || "").trim();
  if (!event) {
    return null;
  }

  const data: RealtimeControlEventData = { event };

  if (typeof raw.text === "string") data.text = raw.text;
  if (typeof raw.intent === "string") data.intent = raw.intent;
  if (typeof raw.message === "string") data.message = raw.message;
  if (typeof raw.utterance_id === "number") {
    data.utterance_id = raw.utterance_id;
  }
  if (typeof raw.transition_index === "number") {
    data.transition_index = raw.transition_index;
  }
  if (typeof raw.session_id === "string")
    data.session_id = raw.session_id;
  if (typeof raw.resumed === "boolean") data.resumed = raw.resumed;
  if (typeof raw.step === "number") data.step = raw.step;
  if (typeof raw.matched === "boolean") data.matched = raw.matched;
  if (typeof raw.response_mode === "string") {
    data.response_mode = raw.response_mode;
  }
  if (typeof raw.reason === "string") data.reason = raw.reason;
  if (typeof raw.from_step === "number")
    data.from_step = raw.from_step;
  if (typeof raw.to_step === "number") data.to_step = raw.to_step;
  if (raw.use_lesson_runtime === true)
    data.use_lesson_runtime = true;
  if (
    raw.lesson &&
    typeof raw.lesson === "object" &&
    !Array.isArray(raw.lesson)
  ) {
    data.lesson = raw.lesson as Record<string, unknown>;
  }
  if (typeof raw.current_step_id === "number") {
    data.current_step_id = raw.current_step_id;
  }
  if (raw.current_media === null) {
    data.current_media = null;
  } else if (
    raw.current_media &&
    typeof raw.current_media === "object" &&
    !Array.isArray(raw.current_media)
  ) {
    data.current_media = raw.current_media as Record<string, unknown>;
  }
  if (typeof raw.feedback_text === "string")
    data.feedback_text = raw.feedback_text;
  if (typeof raw.screen_text === "string") data.screen_text = raw.screen_text;
  if (typeof raw.phase === "string") data.phase = raw.phase;
  if (typeof raw.lifecycle === "string") data.lifecycle = raw.lifecycle;
  if (typeof raw.kind === "string") data.kind = raw.kind;
  if (
    raw.payload &&
    typeof raw.payload === "object" &&
    !Array.isArray(raw.payload)
  ) {
    data.payload = raw.payload as Record<string, unknown>;
  }
  if (
    raw.step_payload &&
    typeof raw.step_payload === "object" &&
    !Array.isArray(raw.step_payload)
  ) {
    data.step_payload = raw.step_payload as Record<string, unknown>;
  }

  // Copy unknown keys
  for (const [k, v] of Object.entries(raw)) {
    if (k in data) continue;
    (data as Record<string, unknown>)[k] = v;
  }

  return data;
}
