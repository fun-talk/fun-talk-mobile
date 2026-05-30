export {
  normalizeRealtimeLessonDefinition,
  toChallengeTemplateSequence,
  toTransitionMediaMap,
  getLessonChallengeScript,
  getLessonChallengeStep,
  getNextLessonChallengeStep,
  getLessonChallengeBackgrounds,
  getLessonChallengeTerminalStep,
  resolveLessonChallengeStepMedia,
} from "./lessonDefinition";

export type {
  // Lesson definition
  RealtimeLessonDefinition,
  RealtimeLessonMetadata,
  RealtimeLessonAssets,
  RealtimeLessonStory,
  RealtimeLessonTeaching,
  RealtimeLessonChallenge,
  RealtimeLessonFlags,
  // Challenge types
  ChallengeTemplateKey,
  LocalChallengeMedia,
  LocalChallengeMediaType,
  LocalChallengeStep,
  LocalChallengeOption,
  LocalChallengeScriptDefinition,
  LocalChallengeTransitionMediaMap,
  LocalChallengeResponseMode,
  LocalChallengeDuolingoReply,
  LocalChallengeDuolingoSuccessReply,
  LocalChallengeDuolingoFailureReply,
  LocalChallengeStageBranch,
  LocalChallengeBranchOnStageEnd,
  // Story types
  StorySegment,
  StoryScriptDefinition,
  StoryMediaType,
  // Teaching types
  TeachingSegment,
  TeachingScriptDefinition,
  TeachingSegmentKind,
  TeachingInteractionType,
  TeachingMediaType,
  TeachingChoiceOption,
  // Free chat types
  FreeChatConfig,
  FreeChatTopicMode,
} from "./lessonDefinition";

export {
  fetchRealtimeLessonDefinition,
  useRealtimeLessonDefinition,
} from "./useLessonLoader";

export type {
  FetchRealtimeLessonOptions,
  RealtimeLessonLoadState,
} from "./useLessonLoader";

export { NativeLessonScreen } from "./NativeLessonScreen";

// WebSocket client (6c)
export { parseFrame, constructWSRequest, encodeBase64, MSG_TYPE_JSON } from "./parseFrame";
export type { ParsedFrame } from "./parseFrame";

export { useRealtimeSession } from "./useRealtimeSession";
export type { DemoPhase } from "./useRealtimeSession";

export {
  normalizeRealtimeControlEvent,
  buildInitSessionCommand,
  buildTriggerStepPromptCommand,
  buildDebugForceNextStepCommand,
  buildVideoPlayFinishedCommand,
  buildStartLessonCommand,
  buildMediaFinishedCommand,
  buildAssistantPromptSpokenCommand,
  buildSubmitChoiceCommand,
} from "./sessionProtocol";

export type {
  RealtimeControlEventData,
  BuildInitSessionCommandOptions,
} from "./sessionProtocol";

// Audio playback and recording (6d, 6e)
export { useAudioPlayback } from "./useAudioPlayback";
export type { AudioPlaybackCallbacks } from "./useAudioPlayback";

export {
  useAudioRecording,
  requestAudioPermission,
  pcmFloat32ToInt16,
  isSpeechLikeFrame,
  CAPTURE_SAMPLE_RATE,
} from "./useAudioRecording";

export type { AudioRecordingCallbacks } from "./useAudioRecording";

// Flow state machine (6f)
export { useLessonFlow } from "./useLessonFlow";
export type {
  LessonFlowState,
  LessonFlowActions,
  LessonFlowRefs,
  UseLessonFlowOptions,
  ConnectionStatus,
  Message,
} from "./useLessonFlow";
