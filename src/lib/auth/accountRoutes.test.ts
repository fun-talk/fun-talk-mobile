import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ADMIN_STUDENT_CREATE_ROUTE,
  ADMIN_TEACHERS_ROUTE,
  COURSES_ROUTE,
  TEACHER_STUDENT_CREATE_ROUTE,
  TEACHER_STUDENTS_ROUTE,
  resolveAuthenticatedHomeRoute,
  resolveTeacherHomeRoute,
} from './accountRoutes';

describe('account route decisions', () => {
  it('routes admin teachers to the admin teacher console', () => {
    assert.equal(
      resolveAuthenticatedHomeRoute({ authType: 'teacher', teacherRole: 'admin', isAdmin: true }),
      ADMIN_TEACHERS_ROUTE,
    );
  });

  it('routes regular teachers to their student console', () => {
    assert.equal(
      resolveTeacherHomeRoute({ authType: 'teacher', teacherRole: 'teacher', isAdmin: false }),
      TEACHER_STUDENTS_ROUTE,
    );
  });

  it('exposes student creation routes for admins and regular teachers', () => {
    assert.equal(ADMIN_STUDENT_CREATE_ROUTE, '/(app)/account/admin/students/new');
    assert.equal(TEACHER_STUDENT_CREATE_ROUTE, '/(app)/account/teacher/students/new');
  });

  it('keeps student and family accounts on the course home', () => {
    assert.equal(resolveAuthenticatedHomeRoute({ authType: 'student' }), COURSES_ROUTE);
    assert.equal(resolveAuthenticatedHomeRoute({ authType: 'home' }), COURSES_ROUTE);
  });
});
