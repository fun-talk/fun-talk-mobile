import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApiClient } from '@/lib/api/client';
import { createMemoryStorage } from '@/lib/storage/asyncStorage';
import { COURSE_HOME_PROGRESS_KEY } from '@/shared/courseHomeProgress';
import { readCourseHomeFoxMove } from '@/shared/courseHomeFoxMove';

import {
  buildNativeLessonCompletionPayload,
  completeNativeLessonProgress,
} from './nativeLessonProgress.ts';

describe('nativeLessonProgress', () => {
  it('builds a course completion payload from route params', () => {
    assert.deepEqual(
      buildNativeLessonCompletionPayload({
        lessonId: '414',
        courseNumber: '2',
        totalCourses: '23',
      }),
      {
        courseNumber: 2,
        lessonId: '414',
        totalCourses: 23,
      },
    );
  });

  it('returns null when completion params are incomplete', () => {
    assert.equal(
      buildNativeLessonCompletionPayload({
        lessonId: '',
        courseNumber: '2',
        totalCourses: '23',
      }),
      null,
    );
    assert.equal(
      buildNativeLessonCompletionPayload({
        lessonId: '414',
        courseNumber: '0',
        totalCourses: '23',
      }),
      null,
    );
  });

  it('saves server-confirmed completion locally', async () => {
    const storage = createMemoryStorage();
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'device-1',
    });
    let requestBody = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      assert.match(String(input), /\/api\/v1\/course_progress\/complete/);
      requestBody = String(init?.body || '');
      return Response.json({
        completed_course_numbers: [2],
        current_course_number: 3,
      });
    };

    try {
      const progress = await completeNativeLessonProgress(
        {
          lessonId: '414',
          courseNumber: '2',
          totalCourses: '23',
        },
        apiClient,
        storage,
      );

      assert.deepEqual(JSON.parse(requestBody), {
        course_number: 2,
        lesson_id: '414',
        total_courses: 23,
        status: 'completed',
      });
      assert.deepEqual(progress, {
        completedCourseNumbers: [2],
        currentCourseNumber: 3,
      });
      assert.match(String(await storage.getItem(COURSE_HOME_PROGRESS_KEY)), /"completedCourseNumbers":\[2\]/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not queue a fox move when reviewing an earlier course', async () => {
    const storage = createMemoryStorage({
      [COURSE_HOME_PROGRESS_KEY]: JSON.stringify({
        completedCourseNumbers: [1, 2, 3],
        currentCourseNumber: 4,
      }),
    });
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'device-1',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({
        completed_course_numbers: [1, 2, 3],
        current_course_number: 4,
      });

    try {
      const progress = await completeNativeLessonProgress(
        {
          lessonId: '414',
          courseNumber: '2',
          totalCourses: '23',
        },
        apiClient,
        storage,
      );

      assert.deepEqual(progress, {
        completedCourseNumbers: [1, 2, 3],
        currentCourseNumber: 4,
      });
      assert.equal(await readCourseHomeFoxMove(23, storage), null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not write local progress when the server rejects completion', async () => {
    const storage = createMemoryStorage();
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'device-1',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('nope', { status: 500 });

    try {
      await assert.rejects(
        () =>
          completeNativeLessonProgress(
            {
              lessonId: '414',
              courseNumber: '2',
              totalCourses: '23',
            },
            apiClient,
            storage,
          ),
        /save course progress failed: 500/,
      );
      assert.equal(await storage.getItem(COURSE_HOME_PROGRESS_KEY), null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
