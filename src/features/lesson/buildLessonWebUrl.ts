export type LessonRouteParams = {
  lesson_id?: string;
  course_number?: string;
  total_courses?: string;
  from?: string;
  skip_opening?: string;
  autostart?: string;
  web_destination?: string;
  web_base_url?: string;
};

export function normalizeRouteParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function buildLessonWebDestination(params: LessonRouteParams): string {
  const explicitDestination = normalizeRouteParam(params.web_destination)?.trim();
  if (explicitDestination) {
    return explicitDestination.startsWith('/') ? explicitDestination : `/${explicitDestination}`;
  }

  const search = new URLSearchParams();
  const lessonId = normalizeRouteParam(params.lesson_id)?.trim();
  if (lessonId) {
    search.set('lesson_id', lessonId);
  }

  const from = normalizeRouteParam(params.from)?.trim();
  if (from) {
    search.set('from', from);
  }

  const courseNumber = normalizeRouteParam(params.course_number)?.trim();
  if (courseNumber) {
    search.set('course_number', courseNumber);
  }

  const totalCourses = normalizeRouteParam(params.total_courses)?.trim();
  if (totalCourses) {
    search.set('total_courses', totalCourses);
  }

  const autostart = normalizeRouteParam(params.autostart)?.trim();
  if (autostart) {
    search.set('autostart', autostart);
  }

  const skipOpening = normalizeRouteParam(params.skip_opening)?.trim();
  if (skipOpening) {
    search.set('skip_opening', skipOpening);
  }

  const query = search.toString();
  return query ? `/app/lesson?${query}` : '/app/lesson';
}

export function buildLessonWebUrl(webBaseUrl: string, destinationPath: string): string {
  const base = webBaseUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(destinationPath)) {
    return destinationPath;
  }
  return `${base}${destinationPath.startsWith('/') ? destinationPath : `/${destinationPath}`}`;
}

export function isCourseHomeWebUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    return pathname === '/app/courses';
  } catch {
    return url.includes('/app/courses');
  }
}
