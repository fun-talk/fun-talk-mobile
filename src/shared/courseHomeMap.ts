export const MAP_WIDTH = 3325;
export const MAP_SEGMENT_HEIGHT = 2155;
export const PUBLISHED_LESSON_STATUS = 1;

export type CourseHomeLesson = {
  id: number;
  lesson_key?: string;
  title?: string;
  description?: string;
  status?: number;
};

export type CourseMapNode = {
  number: number;
  lessonId: string;
  title: string;
  x: number;
  y: number;
};

const BASE_COURSE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 925, y: 700 },
  { x: 1210, y: 760 },
  { x: 1510, y: 790 },
  { x: 1810, y: 700 },
  { x: 2100, y: 610 },
  { x: 2380, y: 605 },
  { x: 2570, y: 850 },
  { x: 2540, y: 1150 },
  { x: 2390, y: 1405 },
  { x: 2115, y: 1390 },
  { x: 1905, y: 1365 },
  { x: 1570, y: 1480 },
  { x: 1320, y: 1530 },
  { x: 1040, y: 1460 },
  { x: 755, y: 1510 },
  { x: 730, y: 1800 },
  { x: 885, y: 2050 },
  { x: 1160, y: 2080 },
  { x: 1455, y: 2025 },
  { x: 1710, y: 1950 },
  { x: 2020, y: 1950 },
  { x: 2300, y: 2050 },
  { x: 2575, y: 1940 },
];

export function getPublishedLessons(lessons: CourseHomeLesson[]): CourseHomeLesson[] {
  return lessons
    .filter((lesson) => lesson.status === PUBLISHED_LESSON_STATUS)
    .sort((left, right) => left.id - right.id);
}

export function getCoursePosition(courseIndex: number): { x: number; y: number } {
  const cycle = Math.floor(courseIndex / BASE_COURSE_POSITIONS.length);
  const base = BASE_COURSE_POSITIONS[courseIndex % BASE_COURSE_POSITIONS.length];
  return {
    x: base.x,
    y: base.y + cycle * MAP_SEGMENT_HEIGHT,
  };
}

export function getCourseMapHeight(totalCourses: number): number {
  if (totalCourses <= 0) {
    return MAP_SEGMENT_HEIGHT;
  }
  return Math.ceil(totalCourses / BASE_COURSE_POSITIONS.length) * MAP_SEGMENT_HEIGHT;
}

export function getCourseMapSegmentCount(totalCourses: number): number {
  if (totalCourses <= 0) {
    return 1;
  }
  return Math.ceil(totalCourses / BASE_COURSE_POSITIONS.length);
}

export function buildCourseMapNodes(
  lessons: CourseHomeLesson[],
  totalCourses: number,
): CourseMapNode[] {
  return Array.from({ length: totalCourses }, (_, index) => {
    const number = index + 1;
    const position = getCoursePosition(index);
    const lesson = lessons[index];
    return {
      number,
      lessonId: String(number),
      title: lesson?.title || `课程 ${number}`,
      x: position.x,
      y: position.y,
    };
  });
}

export function getCourseButtonImage(completed: boolean): string {
  return completed
    ? '/images/home/button-green.png'
    : '/images/home/button-grey.png';
}
