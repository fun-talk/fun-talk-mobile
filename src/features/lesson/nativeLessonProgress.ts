import type { ApiClient } from '@/lib/api/client';
import type { KeyValueStorage } from '@/lib/storage/asyncStorage';
import { defaultAsyncStorage } from '@/lib/storage/asyncStorage';
import {
  saveCourseHomeCourseCompleted,
  type CourseProgress,
} from '@/shared/courseHomeProgress';
import { writeCourseHomeFoxMove } from '@/shared/courseHomeFoxMove';

export type NativeLessonCompletionParams = {
  lessonId?: string;
  courseNumber?: string;
  totalCourses?: string;
};

export type NativeLessonCompletionPayload = {
  courseNumber: number;
  lessonId: string;
  totalCourses: number;
};

function parsePositiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export function buildNativeLessonCompletionPayload(
  params: NativeLessonCompletionParams,
): NativeLessonCompletionPayload | null {
  const lessonId = params.lessonId?.trim();
  const courseNumber = parsePositiveInteger(params.courseNumber);
  const totalCourses = parsePositiveInteger(params.totalCourses);
  if (!lessonId || courseNumber === null || totalCourses === null) {
    return null;
  }
  if (courseNumber > totalCourses) {
    return null;
  }
  return {
    courseNumber,
    lessonId,
    totalCourses,
  };
}

export async function completeNativeLessonProgress(
  params: NativeLessonCompletionParams,
  apiClient: ApiClient,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseProgress> {
  const payload = buildNativeLessonCompletionPayload(params);
  if (!payload) {
    throw new Error('native lesson completion params are incomplete');
  }
  const progress = await saveCourseHomeCourseCompleted(payload, apiClient, storage);
  await writeCourseHomeFoxMove(
    {
      fromCourseNumber: payload.courseNumber,
      toCourseNumber: progress.currentCourseNumber,
    },
    payload.totalCourses,
    storage,
  );
  return progress;
}
