import type { KeyValueStorage } from '@/lib/storage/asyncStorage';
import { defaultAsyncStorage } from '@/lib/storage/asyncStorage';

export const COURSE_HOME_FOX_MOVE_KEY = 'fun-talk-course-home-fox-move-v1';

export type CourseHomeFoxMove = {
  fromCourseNumber: number;
  toCourseNumber: number;
};

function parseCourseNumber(value: unknown, total: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= total ? parsed : null;
}

export function parseStoredCourseHomeFoxMove(
  raw: string | null,
  total: number,
): CourseHomeFoxMove | null {
  try {
    const parsed = JSON.parse(raw || '{}') as Partial<CourseHomeFoxMove>;
    const fromCourseNumber = parseCourseNumber(parsed.fromCourseNumber, total);
    const toCourseNumber = parseCourseNumber(parsed.toCourseNumber, total);
    if (
      fromCourseNumber === null ||
      toCourseNumber === null ||
      toCourseNumber <= fromCourseNumber
    ) {
      return null;
    }
    return { fromCourseNumber, toCourseNumber };
  } catch {
    return null;
  }
}

export async function readCourseHomeFoxMove(
  total: number,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseHomeFoxMove | null> {
  const raw = await storage.getItem(COURSE_HOME_FOX_MOVE_KEY);
  return parseStoredCourseHomeFoxMove(raw, total);
}

export async function writeCourseHomeFoxMove(
  move: CourseHomeFoxMove,
  total: number,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<void> {
  if (
    move.fromCourseNumber < 1 ||
    move.toCourseNumber < 1 ||
    move.fromCourseNumber > total ||
    move.toCourseNumber > total ||
    move.toCourseNumber <= move.fromCourseNumber
  ) {
    await storage.removeItem(COURSE_HOME_FOX_MOVE_KEY);
    return;
  }

  await storage.setItem(COURSE_HOME_FOX_MOVE_KEY, JSON.stringify(move));
}

export async function consumeCourseHomeFoxMove(
  total: number,
  storage: KeyValueStorage = defaultAsyncStorage,
): Promise<CourseHomeFoxMove | null> {
  const move = await readCourseHomeFoxMove(total, storage);
  await storage.removeItem(COURSE_HOME_FOX_MOVE_KEY);
  return move;
}
