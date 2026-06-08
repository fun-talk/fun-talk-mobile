import { NativeLessonUnsupportedError } from './nativeLessonErrors';
import type { NativeLessonDefinition } from './nativeLessonTypes';

function enabledSegmentsCount(section: Record<string, unknown>): number {
  if (section.enabled === false) {
    return 0;
  }
  return Array.isArray(section.segments) ? section.segments.length : 0;
}

export function getUnsupportedNativeLessonShape(
  lesson: NativeLessonDefinition,
): string | null {
  const hasStory = enabledSegmentsCount(lesson.story) > 0;
  const hasTeaching = enabledSegmentsCount(lesson.teaching) > 0;
  const hasChallengeSteps = lesson.summary.stepCount > 0;
  const hasFreeChat = Object.keys(lesson.freeChatBridges).length > 0;

  if (!hasStory && !hasTeaching && !hasChallengeSteps && !hasFreeChat) {
    return 'empty_lesson_content';
  }
  return null;
}

export function assertNativeLessonSupported(lesson: NativeLessonDefinition): void {
  const reason = getUnsupportedNativeLessonShape(lesson);
  if (reason) {
    throw new NativeLessonUnsupportedError(
      reason,
      '这节课没有可渲染的 story、teaching、challenge 或 free chat 内容。',
    );
  }
}

