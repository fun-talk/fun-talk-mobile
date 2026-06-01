import type { ApiClient } from '@/lib/api/client';

import { normalizeRouteParam } from './buildLessonWebUrl';
import type { LessonModeRouteParams } from './lessonMode';
import type {
  NativeLessonChallenge,
  NativeLessonChoiceOption,
  NativeLessonDefinition,
  NativeLessonRouteRequest,
  NativeLessonStep,
} from './nativeLessonTypes';

type NativeRealtimeLessonResponse = {
  lesson?: unknown;
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeStringMap(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(optionalRecord(value)).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function normalizeTransitionMedia(value: unknown): Record<string, { type: string; url: string }> {
  const result: Record<string, { type: string; url: string }> = {};
  for (const [cueId, rawMedia] of Object.entries(optionalRecord(value))) {
    const media = optionalRecord(rawMedia);
    const type = asString(media.type);
    const url = asString(media.url);
    if (type && url) {
      result[cueId] = { type, url };
    }
  }
  return result;
}

function normalizeChoiceOptions(step: Record<string, unknown>): NativeLessonChoiceOption[] {
  const question = optionalRecord(step.question);
  const rawOptions = Array.isArray(step.options)
    ? step.options
    : Array.isArray(question.options)
      ? question.options
      : [];

  return rawOptions
    .map((rawOption) => optionalRecord(rawOption))
    .map((option) => {
      const id = asString(option.id || option.optionId).trim();
      const label = asString(option.label, id);
      const text = asString(option.text, label);
      const imageUrl = asString(option.image_url || option.imageUrl).trim();
      return {
        id,
        label,
        text,
        ...(imageUrl ? { imageUrl } : {}),
      };
    })
    .filter((option) => option.id);
}

function normalizeExpectedPhrases(step: Record<string, unknown>): string[] {
  if (typeof step.expectedText === 'string' && step.expectedText.trim()) {
    return [step.expectedText.trim()];
  }
  if (!Array.isArray(step.expectedPhrases)) {
    return [];
  }
  return step.expectedPhrases
    .map((phrase) => asString(phrase).trim())
    .filter(Boolean);
}

function normalizeSteps(rawSteps: unknown): Record<number, NativeLessonStep> {
  const source = Array.isArray(rawSteps)
    ? Object.fromEntries(rawSteps.map((step, index) => [String(index + 1), step]))
    : optionalRecord(rawSteps);
  const steps: Record<number, NativeLessonStep> = {};

  for (const [stepKey, rawStep] of Object.entries(source)) {
    const step = asRecord(rawStep, 'challenge.step');
    const stepNumber = asNumber(step.step, Number(stepKey));
    if (!Number.isFinite(stepNumber)) {
      throw new Error('challenge step must include numeric step');
    }

    steps[stepNumber] = {
      step: stepNumber,
      promptText: asString(step.promptText),
      screenText: asString(step.screenText || step.screenTextFallback),
      mediaCueId: asString(step.mediaCueId).trim() || undefined,
      responseMode: asString(step.responseMode).trim() || undefined,
      correctOptionId: asString(step.correctOptionId).trim() || undefined,
      expectedPhrases: normalizeExpectedPhrases(step),
      successReply: asString(step.successReply).trim() || undefined,
      retryText: asString(step.retryText).trim() || undefined,
      options: normalizeChoiceOptions(step),
      autoAdvance: asBoolean(step.autoAdvance, false),
      raw: step,
    };
  }

  return steps;
}

function normalizeChallenges(rawChallenges: unknown): NativeLessonChallenge[] {
  if (!Array.isArray(rawChallenges)) {
    throw new Error('challenges must be an array');
  }

  return rawChallenges.map((rawChallenge) => {
    const challenge = asRecord(rawChallenge, 'challenge');
    const key = asString(challenge.key).trim();
    if (!key) {
      throw new Error('challenge key is required');
    }
    const steps = normalizeSteps(challenge.steps);
    const stepNumbers = Object.keys(steps).map((step) => Number(step));
    return {
      key,
      title: asString(challenge.title, key),
      subtitle: asString(challenge.subtitle).trim() || undefined,
      backgroundImageUrl: asString(challenge.backgroundImageUrl).trim() || undefined,
      terminalStep: asNumber(challenge.terminalStep, Math.max(...stepNumbers, 0)),
      steps,
    };
  });
}

export function getNativeLessonRequestFromParams(
  params: LessonModeRouteParams,
  defaultLessonId = '413',
): NativeLessonRouteRequest {
  const sectionId = normalizeRouteParam(params.section_id)?.trim();
  if (sectionId) {
    return { sectionId };
  }

  return {
    lessonId: normalizeRouteParam(params.lesson_id)?.trim() || defaultLessonId,
  };
}

export function buildNativeRealtimeLessonPath(
  request: NativeLessonRouteRequest = {},
): string {
  const search = new URLSearchParams();
  if (request.sectionId?.trim()) {
    search.set('section_id', request.sectionId.trim());
  } else {
    search.set('lesson_id', request.lessonId?.trim() || '413');
  }
  return `/api/v1/realtime_lesson?${search.toString()}`;
}

export function normalizeNativeLessonDefinition(rawLesson: unknown): NativeLessonDefinition {
  const lesson = asRecord(rawLesson, 'lesson');
  const metadata = optionalRecord(lesson.metadata);
  const assets = optionalRecord(lesson.assets);
  const challenges = normalizeChallenges(lesson.challenges);
  const orderedSteps = challenges.flatMap((challenge) =>
    Object.keys(challenge.steps)
      .map((step) => Number(step))
      .sort((a, b) => a - b)
      .map((step) => challenge.steps[step])
      .filter((step): step is NativeLessonStep => Boolean(step)),
  );

  return {
    metadata: {
      id: asString(metadata.id, '413'),
      title: asString(metadata.title, 'FunTalk 课程'),
      version: asNumber(metadata.version, 1),
      coverImageUrl: asString(metadata.coverImageUrl).trim() || undefined,
      defaultSpeaker: asString(metadata.defaultSpeaker).trim() || undefined,
      botName: asString(metadata.botName).trim() || undefined,
    },
    assets: {
      backgrounds: normalizeStringMap(assets.backgrounds),
      transitionMedia: normalizeTransitionMedia(assets.transitionMedia),
      foxVideos: optionalRecord(assets.foxVideos),
    },
    story: optionalRecord(lesson.story),
    teaching: optionalRecord(lesson.teaching),
    challenges,
    freeChatBridges: optionalRecord(lesson.freeChatBridges),
    flags: optionalRecord(lesson.flags),
    summary: {
      challengeCount: challenges.length,
      stepCount: orderedSteps.length,
      firstStep: orderedSteps[0] ?? null,
    },
  };
}

export async function fetchNativeLessonDefinition(
  apiClient: ApiClient,
  request: NativeLessonRouteRequest = {},
): Promise<NativeLessonDefinition> {
  const response = await apiClient.get(buildNativeRealtimeLessonPath(request));
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`加载实时教学配置失败：${response.status} ${errorText}`.trim());
  }

  const payload = (await response.json()) as NativeRealtimeLessonResponse;
  return normalizeNativeLessonDefinition(payload.lesson);
}
