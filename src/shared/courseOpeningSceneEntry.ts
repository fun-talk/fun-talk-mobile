import type { ApiClient } from '@/lib/api/client';

type OpeningSceneConfigResponse = {
  success?: boolean;
  data?: Record<string, unknown> | null;
};

type LessonDetailResponse = {
  lesson?: {
    id?: number;
    source_course_id?: number | null;
  };
};

export function sanitizeInternalReturnPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return null;
  }

  try {
    const url = new URL(path, 'http://localhost');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildOpeningSceneEntryPath(lessonId: string, returnTo: string): string {
  return `/demos/openingScene?lesson_id=${encodeURIComponent(lessonId)}&return_to=${encodeURIComponent(returnTo)}`;
}

export function resolveOpeningSceneExitPath(
  lessonId: string,
  returnTo: string | null | undefined,
): string {
  const safeReturnTo = sanitizeInternalReturnPath(returnTo);
  if (safeReturnTo) {
    return safeReturnTo;
  }
  return `/demos/realtimeConversationV2?lesson_id=${encodeURIComponent(lessonId)}`;
}

export async function lessonHasOpeningSceneConfig(
  lessonId: string,
  apiClient: ApiClient,
): Promise<boolean> {
  const lessonResponse = await apiClient.get(`/api/v1/realtime_lessons/${lessonId}`);
  if (!lessonResponse.ok) {
    return false;
  }

  const lessonPayload = (await lessonResponse.json()) as LessonDetailResponse;
  const lesson = lessonPayload.lesson;
  if (!lesson) {
    return false;
  }

  const courseId =
    lesson.source_course_id && lesson.source_course_id > 0
      ? lesson.source_course_id
      : lesson.id;
  if (!courseId || courseId <= 0) {
    return false;
  }

  const configResponse = await apiClient.get(`/api/v1/opening_scene_config/${courseId}`);
  if (!configResponse.ok) {
    return false;
  }

  const configPayload = (await configResponse.json()) as OpeningSceneConfigResponse;
  return Boolean(configPayload.success && configPayload.data);
}

export async function resolveCourseLessonEntryPath(
  lessonSearch: URLSearchParams,
  skipOpeningScene: boolean,
  apiClient: ApiClient,
): Promise<string> {
  const lessonPath = `/app/lesson?${lessonSearch.toString()}`;
  if (skipOpeningScene) {
    return lessonPath;
  }

  const lessonId = lessonSearch.get('lesson_id')?.trim() || '';
  if (!lessonId) {
    return lessonPath;
  }

  const hasOpeningScene = await lessonHasOpeningSceneConfig(lessonId, apiClient);
  if (!hasOpeningScene) {
    return lessonPath;
  }

  return buildOpeningSceneEntryPath(lessonId, lessonPath);
}

export function buildNativeLessonPath(lessonSearch: URLSearchParams): string {
  return `/lesson?${lessonSearch.toString()}`;
}
