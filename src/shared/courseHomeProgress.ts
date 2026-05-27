import type { ApiClient } from '@/lib/api/client';
import type { KeyValueStorage } from '@/lib/storage/asyncStorage';
import { defaultAsyncStorage } from '@/lib/storage/asyncStorage';

export const COURSE_HOME_PROGRESS_KEY = 'fun-talk-course-home-progress-v1';
export const FALLBACK_TOTAL_COURSES = 23;

export type CourseProgress = {
  completedCourseNumbers: number[];
  currentCourseNumber: number;
};

type CourseProgressApiResponse = {
  completed_course_numbers?: number[];
  current_course_number?: number;
};

export function parseStoredCourseProgress(
  raw: string | null,
  total: number,
): CourseProgress {
  try {
    const parsed = JSON.parse(raw || '{}') as Partial<CourseProgress>;
    const completed = Array.from(
      new Set(
        (parsed.completedCourseNumbers || [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 1 && value <= total),
      ),
    ).sort((a, b) => a - b);
    const firstOpen = Math.min(total, completed.length + 1);
    const requestedCurrent = Number(parsed.currentCourseNumber);
    const current =
      Number.isInteger(requestedCurrent) && requestedCurrent >= 1 && requestedCurrent <= total
        ? requestedCurrent
        : firstOpen;
    return { completedCourseNumbers: completed, currentCourseNumber: current };
  } catch {
    return { completedCourseNumbers: [], currentCourseNumber: 1 };
  }
}

export function buildCompletedCourseProgress(
  courseNumber: number,
  total = FALLBACK_TOTAL_COURSES,
  previous?: CourseProgress,
): CourseProgress {
  const progress = previous ?? parseStoredCourseProgress(null, total);
  const completedCourseNumbers = Array.from(
    new Set([...progress.completedCourseNumbers, courseNumber]),
  )
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const nextCourse = Math.min(total, Math.max(courseNumber + 1, completedCourseNumbers.length + 1));
  return {
    completedCourseNumbers,
    currentCourseNumber: nextCourse,
  };
}

export function normalizeServerProgress(
  payload: CourseProgressApiResponse,
  total: number,
): CourseProgress {
  const completed = Array.from(
    new Set(
      (payload.completed_course_numbers || [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= total),
    ),
  ).sort((a, b) => a - b);
  const requestedCurrent = Number(payload.current_course_number);
  const current =
    Number.isInteger(requestedCurrent) && requestedCurrent >= 1 && requestedCurrent <= total
      ? requestedCurrent
      : Math.min(total, completed.length + 1);
  return { completedCourseNumbers: completed, currentCourseNumber: current };
}

export async function readCourseProgress(
  total: number,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseProgress> {
  const raw = await storage.getItem(COURSE_HOME_PROGRESS_KEY);
  return parseStoredCourseProgress(raw, total);
}

export async function writeCourseProgress(
  progress: CourseProgress,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<void> {
  await storage.setItem(COURSE_HOME_PROGRESS_KEY, JSON.stringify(progress));
}

export async function markCourseHomeCourseCompleted(
  courseNumber: number,
  total = FALLBACK_TOTAL_COURSES,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseProgress> {
  const previous = await readCourseProgress(total, storage);
  const progress = buildCompletedCourseProgress(courseNumber, total, previous);
  await writeCourseProgress(progress, storage);
  return progress;
}

export async function fetchCourseHomeProgress(
  total: number,
  apiClient: ApiClient,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseProgress> {
  const params = new URLSearchParams({ total_courses: String(total) });
  const response = await apiClient.get(`/api/v1/course_progress?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`load course progress failed: ${response.status}`);
  }

  const progress = normalizeServerProgress(
    (await response.json()) as CourseProgressApiResponse,
    total,
  );
  await writeCourseProgress(progress, storage);
  return progress;
}

export async function saveCourseHomeCourseCompleted(
  options: {
    courseNumber: number;
    lessonId: string;
    totalCourses: number;
  },
  apiClient: ApiClient,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseProgress> {
  const response = await apiClient.post('/api/v1/course_progress/complete', {
    course_number: options.courseNumber,
    lesson_id: options.lessonId,
    total_courses: options.totalCourses,
    status: 'completed',
  });

  if (!response.ok) {
    throw new Error(`save course progress failed: ${response.status}`);
  }

  const progress = normalizeServerProgress(
    (await response.json()) as CourseProgressApiResponse,
    options.totalCourses,
  );
  await writeCourseProgress(progress, storage);
  return progress;
}
