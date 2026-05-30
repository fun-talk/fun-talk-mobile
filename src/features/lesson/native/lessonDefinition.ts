/**
 * Type definitions and normalization for realtime lesson definitions.
 * Ported from fun-talk-web: realtimeConversationV2LessonDefinition.ts
 * and its dependent type files.
 */

// ---------------------------------------------------------------------------
// Shared / free-chat types
// ---------------------------------------------------------------------------

export type FreeChatTopicMode = "a" | "b" | "c";

export interface FreeChatConfig {
  id: string;
  openingQuestion: string;
  topicMode: FreeChatTopicMode;
  minUserTurns?: number;
  maxUserTurns?: number;
  returnHint?: string;
  contextSummary?: string;
}

// ---------------------------------------------------------------------------
// Challenge types
// ---------------------------------------------------------------------------

export type ChallengeTemplateKey = string;

export type LocalChallengeMediaType = "image" | "video";
export type LocalChallengeResponseMode = "choice" | "speech" | "autoAdvance";

export interface LocalChallengeOption {
  id: string;
  label: string;
  text?: string;
  image_url?: string;
  /** @deprecated 兼容旧数据中的 image 字段，请优先使用 image_url */
  image?: string;
}

export interface LocalChallengeMedia {
  type: LocalChallengeMediaType;
  url: string;
}

export interface LocalChallengeDuolingoSuccessReply {
  lead: string;
  reteach?: string;
  expand?: string;
  next: string;
  outro?: string;
}

export interface LocalChallengeDuolingoFailureReply {
  lead: string;
  teach: string;
  next: string;
  noAnswerLead?: string;
  outro?: string;
}

export interface LocalChallengeDuolingoReply {
  success: LocalChallengeDuolingoSuccessReply;
  failure: LocalChallengeDuolingoFailureReply;
}

export interface LocalChallengeStageBranch {
  condition: string;
  nextStep: number;
}

export interface LocalChallengeBranchOnStageEnd {
  scoreMetric: "phase_correct_count";
  branches: LocalChallengeStageBranch[];
}

export interface LocalChallengeStep {
  step: number;
  title: string;
  phaseTitle?: string;
  promptText: string;
  voiceUrl?: string;
  instructionText?: string;
  screenText?: string;
  screenTextFallback?: string;
  media?: LocalChallengeMedia;
  mediaCueId?: string;
  responseMode?: LocalChallengeResponseMode;
  expectedText?: string;
  expectedPhrases?: readonly string[];
  correctOptionId?: string;
  options?: readonly LocalChallengeOption[];
  successReply?: string;
  successAiPraiseBeforeReply?: boolean;
  retryText?: string;
  duolingoReply?: LocalChallengeDuolingoReply;
  autoAdvance?: boolean;
  freeChatConfig?: FreeChatConfig;
  branchOnStageEnd?: LocalChallengeBranchOnStageEnd;
  nextStep?: number;
  backgroundImageUrl?: string;
}

export interface LocalChallengeScriptDefinition {
  key: ChallengeTemplateKey;
  title: string;
  openingStep: number;
  steps: Record<number, LocalChallengeStep>;
}

export type LocalChallengeTransitionMediaMap = Record<
  string,
  LocalChallengeMedia
>;

// ---------------------------------------------------------------------------
// Story types
// ---------------------------------------------------------------------------

export type StoryMediaType = "image" | "video";

export interface StorySegment {
  id: string;
  spokenText: string;
  voiceUrl?: string;
  mediaType?: StoryMediaType;
  mediaUrl?: string;
  pauseAfterMs?: number;
}

export interface StoryScriptDefinition {
  title: string;
  backgroundImageUrl: string;
  openingVideoUrl: string;
  segments: StorySegment[];
}

// ---------------------------------------------------------------------------
// Teaching types
// ---------------------------------------------------------------------------

export type TeachingMediaType = "image" | "video";
export type TeachingSegmentKind = "narration" | "interaction" | "free_chat";
export type TeachingInteractionType = "answer" | "repeat" | "speech" | "choice";

export interface TeachingChoiceOption {
  id: string;
  label: string;
  text: string;
  image_url?: string;
}

export interface TeachingSegment {
  id: string;
  kind: TeachingSegmentKind;
  spokenText: string;
  voiceUrl?: string;
  /** Used instead of spokenText when the session is in follow-read mode. */
  followReadSpokenText?: string;
  mediaType?: TeachingMediaType;
  mediaUrl?: string;
  mediaDescription?: string;
  mediaDescriptionVoiceUrl?: string;
  mediaCueId?: string;
  backgroundImageUrl?: string;
  pauseAfterMs?: number;
  interactionType?: TeachingInteractionType;
  requiresUserResponse?: boolean;
  expectedResponseText?: string;
  successReply?: string | string[];
  retryReply?: string | string[];
  encourageReply?: string | string[];
  freeChatConfig?: FreeChatConfig;
  /** Choice options for interactionType === "choice" */
  options?: TeachingChoiceOption[];
}

export interface TeachingScriptDefinition {
  title: string;
  backgroundImageUrl: string;
  segments: TeachingSegment[];
}

// ---------------------------------------------------------------------------
// Lesson definition (top-level)
// ---------------------------------------------------------------------------

export interface RealtimeLessonMetadata {
  id: string;
  title: string;
  version: number;
  coverImageUrl?: string;
  defaultSpeaker?: string;
  botName?: string;
}

export interface RealtimeLessonAssets {
  backgrounds: Record<string, string>;
  transitionMedia: LocalChallengeTransitionMediaMap;
  foxVideos: {
    idle?: string;
    talking?: string;
  };
}

export interface RealtimeLessonStory extends StoryScriptDefinition {
  enabled: boolean;
}

export interface RealtimeLessonTeaching extends TeachingScriptDefinition {
  enabled: boolean;
}

export interface RealtimeLessonChallenge extends LocalChallengeScriptDefinition {
  key: ChallengeTemplateKey;
  subtitle?: string;
  backgroundImageUrl: string;
  terminalStep: number;
}

export interface RealtimeLessonFlags {
  storyIntroEnabled: boolean;
  teachingIntroEnabled: boolean;
  duolingoOnly?: boolean;
}

export interface RealtimeLessonDefinition {
  metadata: RealtimeLessonMetadata;
  assets: RealtimeLessonAssets;
  story: RealtimeLessonStory;
  teaching: RealtimeLessonTeaching;
  challenges: RealtimeLessonChallenge[];
  freeChatBridges: {
    preDuolingo?: FreeChatConfig;
    [key: string]: FreeChatConfig | undefined;
  };
  flags: RealtimeLessonFlags;
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMediaMap(
  value: unknown,
): LocalChallengeTransitionMediaMap {
  const source = asRecord(value || {}, "assets.transitionMedia");
  const result: LocalChallengeTransitionMediaMap = {};
  Object.entries(source).forEach(([cueId, rawMedia]) => {
    const media = asRecord(rawMedia, `assets.transitionMedia.${cueId}`);
    const type = asString(media.type);
    const url = asString(media.url);
    if ((type === "image" || type === "video") && url) {
      result[cueId] = { type, url };
    }
  });
  return result;
}

function normalizeStory(rawStory: unknown): RealtimeLessonStory {
  const story = asRecord(rawStory, "story");
  return {
    enabled: asBoolean(story.enabled, false),
    title: asString(story.title),
    backgroundImageUrl: asString(story.backgroundImageUrl),
    openingVideoUrl: asString(story.openingVideoUrl),
    segments: Array.isArray(story.segments)
      ? (story.segments as StorySegment[])
      : [],
  };
}

function normalizeTeaching(rawTeaching: unknown): RealtimeLessonTeaching {
  const teaching = asRecord(rawTeaching, "teaching");
  return {
    enabled: asBoolean(teaching.enabled, true),
    title: asString(teaching.title),
    backgroundImageUrl: asString(teaching.backgroundImageUrl),
    segments: Array.isArray(teaching.segments)
      ? (teaching.segments as TeachingSegment[])
      : [],
  };
}

function normalizeChallengeStepMedia(
  step: Record<string, unknown>,
): void {
  const rawMedia = step.media;

  // Handle legacy string format: "media": "https://..."
  if (typeof rawMedia === "string") {
    const url = rawMedia.trim();
    if (url) {
      step.media = {
        type: "image",
        url,
      };
    } else {
      delete step.media;
    }
    return;
  }

  if (rawMedia && typeof rawMedia === "object" && !Array.isArray(rawMedia)) {
    const mediaRecord = rawMedia as Record<string, unknown>;
    const imageUrl = asString(mediaRecord.imageUrl);
    const videoUrl = asString(mediaRecord.videoUrl);
    const imageCueId = asString(mediaRecord.imageCueId);
    const videoCueId = asString(mediaRecord.videoCueId);

    // If already in standard format (type + url), keep it as-is
    const standardType = asString(mediaRecord.type);
    const standardUrl = asString(mediaRecord.url);
    const isStandardFormat =
      (standardType === "image" || standardType === "video") && standardUrl;

    if (isStandardFormat) {
      const cueId = imageCueId || videoCueId;
      if (cueId) {
        step.mediaCueId = cueId;
      }
      return;
    }

    if (imageUrl || videoUrl) {
      step.media = {
        type: imageUrl ? "image" : "video",
        url: imageUrl || videoUrl,
      };
    } else {
      delete step.media;
    }

    const cueId = imageCueId || videoCueId;
    if (cueId) {
      step.mediaCueId = cueId;
    }
    return;
  }

  // Fallback: handle flat fields directly on the step object
  const stepImageUrl = asString(step.imageUrl);
  const stepVideoUrl = asString(step.videoUrl);
  const stepImageCueId = asString(step.imageCueId);
  const stepVideoCueId = asString(step.videoCueId);

  if (stepImageUrl || stepVideoUrl) {
    step.media = {
      type: stepImageUrl ? "image" : "video",
      url: stepImageUrl || stepVideoUrl,
    };
  }

  const stepCueId = stepImageCueId || stepVideoCueId;
  if (stepCueId) {
    step.mediaCueId = stepCueId;
  }
}

function normalizeSteps(
  rawSteps: unknown,
): Record<number, LocalChallengeStep> {
  const source = asRecord(rawSteps || {}, "challenge.steps");
  const steps: Record<number, LocalChallengeStep> = {};
  Object.entries(source).forEach(([stepKey, rawStep]) => {
    const step = asRecord(rawStep, "challenge.step");
    let stepNumber = asNumber(step.step, NaN);
    // fallback: infer from steps object key if step field is missing
    if (!Number.isFinite(stepNumber)) {
      stepNumber = asNumber(stepKey, NaN);
      // Write back so the step object carries its own number
      if (Number.isFinite(stepNumber)) {
        step.step = stepNumber;
      }
    }
    if (!Number.isFinite(stepNumber)) {
      throw new Error("challenge step must include numeric step");
    }
    normalizeChallengeStepMedia(step);
    steps[stepNumber] = step as unknown as LocalChallengeStep;
  });
  return steps;
}

function normalizeChallenges(
  rawChallenges: unknown,
): RealtimeLessonChallenge[] {
  if (rawChallenges === undefined || rawChallenges === null) {
    return [];
  }
  if (!Array.isArray(rawChallenges)) {
    throw new Error("challenges must be an array");
  }

  return rawChallenges.map((rawChallenge) => {
    const challenge = asRecord(rawChallenge, "challenge");
    const key = asString(challenge.key);
    if (!key) {
      throw new Error("challenge key is required");
    }
    const steps = normalizeSteps(challenge.steps);
    return {
      key: key as ChallengeTemplateKey,
      title: asString(challenge.title, key),
      subtitle: asString(challenge.subtitle),
      backgroundImageUrl: asString(challenge.backgroundImageUrl),
      openingStep: asNumber(challenge.openingStep, 1),
      terminalStep: asNumber(
        challenge.terminalStep,
        Math.max(...Object.keys(steps).map((s) => Number(s)), 0),
      ),
      steps,
    };
  });
}

// ---------------------------------------------------------------------------
// Main normalization entry point
// ---------------------------------------------------------------------------

export function normalizeRealtimeLessonDefinition(
  rawLesson: unknown,
): RealtimeLessonDefinition {
  const lesson = asRecord(rawLesson, "lesson");
  const metadata = asRecord(lesson.metadata, "metadata");
  const assets = asRecord(lesson.assets, "assets");
  const backgrounds = asRecord(
    assets.backgrounds || {},
    "assets.backgrounds",
  );
  const flags = asRecord(lesson.flags || {}, "flags");

  return {
    metadata: {
      id: asString(metadata.id, "413"),
      title: asString(metadata.title, "Realtime Lesson"),
      version: asNumber(metadata.version, 1),
      coverImageUrl: asString(metadata.coverImageUrl, ""),
      defaultSpeaker: asString(metadata.defaultSpeaker),
      botName: asString(metadata.botName),
    },
    assets: {
      backgrounds: Object.fromEntries(
        Object.entries(backgrounds).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      transitionMedia: normalizeMediaMap(assets.transitionMedia || {}),
      foxVideos: asRecord(
        assets.foxVideos || {},
        "assets.foxVideos",
      ) as {
        idle?: string;
        talking?: string;
      },
    },
    story: normalizeStory(lesson.story),
    teaching: normalizeTeaching(lesson.teaching),
    challenges: normalizeChallenges(lesson.challenges),
    freeChatBridges: asRecord(
      lesson.freeChatBridges || {},
      "freeChatBridges",
    ) as RealtimeLessonDefinition["freeChatBridges"],
    flags: {
      storyIntroEnabled: asBoolean(flags.storyIntroEnabled, false),
      teachingIntroEnabled: asBoolean(flags.teachingIntroEnabled, true),
      duolingoOnly: asBoolean(flags.duolingoOnly, false),
    },
  };
}

// ---------------------------------------------------------------------------
// Lesson definition helpers (ported from web)
// ---------------------------------------------------------------------------

export function toChallengeTemplateSequence(
  lesson: RealtimeLessonDefinition,
): ChallengeTemplateKey[] {
  return lesson.challenges.map((challenge) => challenge.key);
}

export function toTransitionMediaMap(
  lesson: RealtimeLessonDefinition,
): LocalChallengeTransitionMediaMap {
  return lesson.assets.transitionMedia;
}

export function getLessonChallengeScript(
  lesson: RealtimeLessonDefinition,
  key: ChallengeTemplateKey,
): LocalChallengeScriptDefinition | null {
  return lesson.challenges.find((challenge) => challenge.key === key) || null;
}

export function getLessonChallengeStep(
  lesson: RealtimeLessonDefinition,
  key: ChallengeTemplateKey,
  step: number,
): LocalChallengeStep | null {
  return getLessonChallengeScript(lesson, key)?.steps[step] || null;
}

export function getNextLessonChallengeStep(
  lesson: RealtimeLessonDefinition,
  key: ChallengeTemplateKey,
  step: number,
): LocalChallengeStep | null {
  return getLessonChallengeStep(lesson, key, step + 1);
}

export function getLessonChallengeBackgrounds(
  lesson: RealtimeLessonDefinition,
): Record<string, string> {
  return Object.fromEntries(
    lesson.challenges.map((challenge) => [
      challenge.key,
      challenge.backgroundImageUrl,
    ]),
  );
}

export function getLessonChallengeTerminalStep(
  lesson: RealtimeLessonDefinition,
  key: ChallengeTemplateKey,
): number {
  return (
    lesson.challenges.find((challenge) => challenge.key === key)
      ?.terminalStep || 0
  );
}

export function resolveLessonChallengeStepMedia(
  step: LocalChallengeStep,
  mediaMap: LocalChallengeTransitionMediaMap,
): LocalChallengeMedia | undefined {
  if (step.media) return step.media;
  return step.mediaCueId ? mediaMap[step.mediaCueId] : undefined;
}
