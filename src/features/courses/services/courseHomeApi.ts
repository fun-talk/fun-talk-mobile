import type { ApiClient } from '@/lib/api/client';
import { getPublishedLessons, type CourseHomeLesson } from '@/shared/courseHomeMap';

type RealtimeLessonsResponse = {
  lessons?: CourseHomeLesson[];
};

export async function fetchPublishedLessons(apiClient: ApiClient): Promise<CourseHomeLesson[]> {
  const response = await apiClient.get('/api/v1/realtime_lessons?published_only=1');
  if (!response.ok) {
    throw new Error(`load realtime lessons failed: ${response.status}`);
  }

  const payload = (await response.json()) as RealtimeLessonsResponse;
  return getPublishedLessons(Array.isArray(payload.lessons) ? payload.lessons : []);
}

export async function postLogout(apiClient: ApiClient): Promise<void> {
  const response = await apiClient.post('/api/v1/logout');
  if (!response.ok) {
    console.warn('logout failed:', response.status);
  }
}

export async function shouldForceLogout(apiClient: ApiClient): Promise<boolean> {
  try {
    const response = await apiClient.get('/api/v1/should_logout');
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { logout?: boolean };
    return Boolean(payload.logout);
  } catch (error) {
    console.warn('should_logout check failed:', error);
    return false;
  }
}
