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
  records?: CourseProgressApiRecord[];
};

type CourseProgressApiRecord = {
  course_number?: number;
  lesson_id?: string;
  status?: string;
  completed_at?: number;
};

export type LearningRecord = {
  courseNumber: number;
  lessonId: string;
  completedAt: number;
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

export function mergeCourseProgress(
  incoming: CourseProgress,
  total: number,
  previous?: CourseProgress,
): CourseProgress {
  if (!previous) {
    return incoming;
  }
  const completedCourseNumbers = Array.from(
    new Set([...previous.completedCourseNumbers, ...incoming.completedCourseNumbers]),
  )
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const firstOpen = Math.min(total, completedCourseNumbers.length + 1);
  const currentCourseNumber = Math.min(
    total,
    Math.max(previous.currentCourseNumber, incoming.currentCourseNumber, firstOpen),
  );
  return {
    completedCourseNumbers,
    currentCourseNumber,
  };
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

export async function writeMergedCourseProgress(
  progress: CourseProgress,
  total: number,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseProgress> {
  const previous = await readCourseProgress(total, storage);
  const merged = mergeCourseProgress(progress, total, previous);
  await writeCourseProgress(merged, storage);
  return merged;
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

export async function fetchLearningRecords(
  apiClient: ApiClient,
): Promise<LearningRecord[]> {
  const response = await apiClient.get('/api/v1/course_progress');
  if (!response.ok) {
    throw new Error(`load learning records failed: ${response.status}`);
  }

  const payload = (await response.json()) as CourseProgressApiResponse;
  return (payload.records || [])
    .filter(
      (record) =>
        record.status === 'completed' &&
        Number.isInteger(record.course_number) &&
        Number(record.course_number) >= 1 &&
        Number(record.completed_at) > 0,
    )
    .map((record) => ({
      courseNumber: Number(record.course_number),
      lessonId: String(record.lesson_id || ''),
      completedAt: Number(record.completed_at),
    }))
    .sort((left, right) => right.completedAt - left.completedAt);
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
  const previous = await readCourseProgress(options.totalCourses, storage);
  const optimisticProgress = buildCompletedCourseProgress(
    options.courseNumber,
    options.totalCourses,
    previous,
  );
  const response = await apiClient.post('/api/v1/course_progress/complete', {
    course_number: options.courseNumber,
    lesson_id: options.lessonId,
    total_courses: options.totalCourses,
    status: 'completed',
  });

  if (!response.ok) {
    throw new Error(`save course progress failed: ${response.status}`);
  }

  const progress = mergeCourseProgress(
    normalizeServerProgress(
      (await response.json()) as CourseProgressApiResponse,
      options.totalCourses,
    ),
    options.totalCourses,
    optimisticProgress,
  );
  await writeCourseProgress(progress, storage);
  return progress;
}
