import type { FtAuthRecord } from './types';

export const LOGIN_ROUTE = '/(auth)/login';
export const COURSES_ROUTE = '/(app)/courses';
export const ADMIN_TEACHERS_ROUTE = '/(app)/account/admin/teachers';
export const TEACHER_STUDENTS_ROUTE = '/(app)/account/teacher/students';
export const ADMIN_STUDENT_CREATE_ROUTE = '/(app)/account/admin/students/new';
export const TEACHER_STUDENT_CREATE_ROUTE = '/(app)/account/teacher/students/new';

export function isTeacherAuth(auth: FtAuthRecord | null): boolean {
  return auth?.authType === 'teacher' || auth?.accountType === 'teacher_account';
}

export function isAdminTeacher(auth: FtAuthRecord | null): boolean {
  return isTeacherAuth(auth) && (auth?.isAdmin === true || auth?.teacherRole === 'admin');
}

export function resolveTeacherHomeRoute(auth: FtAuthRecord | null): string {
  return isAdminTeacher(auth) ? ADMIN_TEACHERS_ROUTE : TEACHER_STUDENTS_ROUTE;
}

export function resolveAuthenticatedHomeRoute(auth: FtAuthRecord | null): string {
  if (isTeacherAuth(auth)) {
    return resolveTeacherHomeRoute(auth);
  }
  return COURSES_ROUTE;
}
