import type { NativeLessonDefinition, NativeLessonStep } from './nativeLessonTypes';

export type NativeLessonOpeningPreview = {
  backgroundImageUrl: string;
  media: { type: string; url: string } | null;
  speechText: string;
  stageLabel: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getStorySegment(lesson: NativeLessonDefinition): Record<string, unknown> {
  const story = asRecord(lesson.story);
  const segments = Array.isArray(story.segments) ? story.segments : [];
  return asRecord(segments[0]);
}

function getStepMedia(
  lesson: NativeLessonDefinition,
  step: NativeLessonStep | null,
): { type: string; url: string } | null {
  if (!step?.mediaCueId) {
    return null;
  }
  return lesson.assets.transitionMedia[step.mediaCueId] ?? null;
}

export function resolveNativeLessonOpeningPreview(
  lesson: NativeLessonDefinition,
): NativeLessonOpeningPreview {
  const story = asRecord(lesson.story);
  const teaching = asRecord(lesson.teaching);
  const firstStorySegment = getStorySegment(lesson);
  const firstStep = lesson.summary.firstStep;
  const stepMedia = getStepMedia(lesson, firstStep);
  const storyMediaUrl = asString(firstStorySegment.mediaUrl);
  const storyMediaType = asString(firstStorySegment.mediaType) || 'video';

  return {
    backgroundImageUrl:
      asString(story.backgroundImageUrl) ||
      lesson.assets.backgrounds.story ||
      asString(teaching.backgroundImageUrl) ||
      lesson.assets.backgrounds.teaching ||
      lesson.challenges[0]?.backgroundImageUrl ||
      '',
    media: storyMediaUrl
      ? { type: storyMediaType, url: storyMediaUrl }
      : stepMedia,
    speechText:
      asString(firstStorySegment.spokenText) ||
      asString(firstStorySegment.text) ||
      firstStep?.promptText ||
      '课程内容已加载，等待开始。',
    stageLabel:
      asString(story.title) ||
      lesson.challenges[0]?.title ||
      lesson.challenges[0]?.key ||
      '课程预览',
  };
}
