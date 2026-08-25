export const MAP_WIDTH = 3325;
export const MAP_SEGMENT_HEIGHT = 4988;
export const MAP_BOTTOM_ACTION_SPACE = 0;
export const PUBLISHED_LESSON_STATUS = 1;

export type CourseHomeLesson = {
  id: number;
  lesson_key?: string;
  title?: string;
  description?: string;
  cover_image_url?: string;
  status?: number;
};

export type CourseMapNode = {
  number: number;
  lessonId: string;
  title: string;
  coverImageUrl: string;
  x: number;
  y: number;
};

const BASE_COURSE_POSITIONS: { x: number; y: number }[] = [
  { x: 903, y: 596 },
  { x: 1219, y: 643 },
  { x: 1547, y: 666 },
  { x: 1860, y: 600 },
  { x: 2153, y: 483 },
  { x: 2465, y: 428 },
  { x: 2751, y: 545 },
  { x: 2755, y: 838 },
  { x: 2727, y: 1155 },
  { x: 2669, y: 1448 },
  { x: 2360, y: 1421 },
  { x: 2051, y: 1354 },
  { x: 1762, y: 1471 },
  { x: 1477, y: 1600 },
  { x: 1157, y: 1565 },
  { x: 864, y: 1452 },
  { x: 602, y: 1585 },
  { x: 613, y: 1901 },
  { x: 789, y: 2159 },
  { x: 1090, y: 2241 },
  { x: 1418, y: 2214 },
  { x: 1715, y: 2116 },
  { x: 2028, y: 2065 },
  { x: 2336, y: 2139 },
  { x: 2641, y: 2218 },
  { x: 2766, y: 2495 },
  { x: 2520, y: 2682 },
  { x: 2196, y: 2702 },
  { x: 1918, y: 2847 },
  { x: 1625, y: 2960 },
  { x: 1317, y: 2893 },
  { x: 1016, y: 2808 },
  { x: 696, y: 2843 },
  { x: 754, y: 3097 },
  { x: 875, y: 3370 },
  { x: 789, y: 3659 },
  { x: 1078, y: 3773 },
  { x: 1407, y: 3761 },
  { x: 1731, y: 3722 },
  { x: 2051, y: 3757 },
  { x: 2313, y: 3937 },
  { x: 2587, y: 4105 },
  { x: 2688, y: 4390 },
  { x: 2442, y: 4562 },
  { x: 2125, y: 4523 },
  { x: 1844, y: 4390 },
  { x: 1567, y: 4245 },
  { x: 1250, y: 4187 },
  { x: 942, y: 4261 },
  { x: 821, y: 4542 },
  { x: 598, y: 4781 },
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
  const bottomActionSpace = MAP_BOTTOM_ACTION_SPACE;
  if (totalCourses <= 0) {
    return MAP_SEGMENT_HEIGHT + bottomActionSpace;
  }
  return Math.ceil(totalCourses / BASE_COURSE_POSITIONS.length) * MAP_SEGMENT_HEIGHT + bottomActionSpace;
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
      // Keep the displayed course number sequential, but route using the
      // backend lesson id so deleted lessons cannot be reopened by position.
      lessonId: String(lesson?.id ?? number),
      title: lesson?.title || `课程 ${number}`,
      coverImageUrl: lesson?.cover_image_url || '',
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
