import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { createApiClient } from '@/lib/api/client';
import { createMemoryStorage } from '@/lib/storage/asyncStorage';

import {
  COURSE_HOME_PROGRESS_KEY,
  fetchCourseHomeProgress,
  fetchLearningRecords,
  markCourseHomeCourseCompleted,
  parseStoredCourseProgress,
  readCourseProgress,
  saveCourseHomeCourseCompleted,
  writeMergedCourseProgress,
} from './courseHomeProgress';

describe('course home progress', () => {
  const storage = createMemoryStorage();

  beforeEach(async () => {
    await storage.removeItem(COURSE_HOME_PROGRESS_KEY);
  });

  it('defaults to the first course when no progress is stored', async () => {
    assert.deepEqual(await readCourseProgress(23, storage), {
      completedCourseNumbers: [],
      currentCourseNumber: 1,
    });
  });

  it('records completed courses and advances the fox target', async () => {
    await markCourseHomeCourseCompleted(3, 23, storage);
    assert.deepEqual(parseStoredCourseProgress(await storage.getItem(COURSE_HOME_PROGRESS_KEY), 23), {
      completedCourseNumbers: [3],
      currentCourseNumber: 4,
    });
  });

  it('ignores stored course numbers outside the map', async () => {
    await storage.setItem(
      COURSE_HOME_PROGRESS_KEY,
      JSON.stringify({
        completedCourseNumbers: [1, 2, 999],
        currentCourseNumber: 999,
      }),
    );
    assert.deepEqual(await readCourseProgress(3, storage), {
      completedCourseNumbers: [1, 2],
      currentCourseNumber: 3,
    });
  });

  it('loads progress from the server response', async () => {
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'test-device',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request) => {
      assert.match(String(input), /\/api\/v1\/course_progress\?total_courses=23/);
      return new Response(
        JSON.stringify({
          completed_course_numbers: [1, 2],
          current_course_number: 3,
        }),
        { status: 200 },
      );
    };

    try {
      assert.deepEqual(await fetchCourseHomeProgress(23, apiClient, storage), {
        completedCourseNumbers: [1, 2],
        currentCourseNumber: 3,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('loads completed learning records in newest-first order', async () => {
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'test-device',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({
        records: [
          { course_number: 1, lesson_id: '12', status: 'completed', completed_at: 100 },
          { course_number: 2, lesson_id: '13', status: 'started', completed_at: 200 },
          { course_number: 3, lesson_id: '15', status: 'completed', completed_at: 300 },
        ],
      });

    try {
      assert.deepEqual(await fetchLearningRecords(apiClient), [
        { courseNumber: 3, lessonId: '15', completedAt: 300 },
        { courseNumber: 1, lessonId: '12', completedAt: 100 },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('replaces stale local progress when loading the current user from the server', async () => {
    await storage.setItem(
      COURSE_HOME_PROGRESS_KEY,
      JSON.stringify({
        completedCourseNumbers: [1, 2, 3, 4],
        currentCourseNumber: 5,
      }),
    );
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'test-device',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({
        completed_course_numbers: [],
        current_course_number: 1,
      });

    try {
      assert.deepEqual(await fetchCourseHomeProgress(23, apiClient, storage), {
        completedCourseNumbers: [],
        currentCourseNumber: 1,
      });
      assert.deepEqual(await readCourseProgress(23, storage), {
        completedCourseNumbers: [],
        currentCourseNumber: 1,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('keeps the final course completed when completion save echoes stale server progress', async () => {
    await storage.setItem(
      COURSE_HOME_PROGRESS_KEY,
      JSON.stringify({
        completedCourseNumbers: [1, 2, 3, 4, 5],
        currentCourseNumber: 5,
      }),
    );
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'test-device',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json({
        completed_course_numbers: [1, 2, 3, 4],
        current_course_number: 5,
      });

    try {
      assert.deepEqual(
        await saveCourseHomeCourseCompleted(
          {
            courseNumber: 5,
            lessonId: '417',
            totalCourses: 5,
          },
          apiClient,
          storage,
        ),
        {
          completedCourseNumbers: [1, 2, 3, 4, 5],
          currentCourseNumber: 5,
        },
      );
      assert.deepEqual(await readCourseProgress(5, storage), {
        completedCourseNumbers: [1, 2, 3, 4, 5],
        currentCourseNumber: 5,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('merges direct WebView progress updates without downgrading local progress', async () => {
    await storage.setItem(
      COURSE_HOME_PROGRESS_KEY,
      JSON.stringify({
        completedCourseNumbers: [1, 2, 3, 4],
        currentCourseNumber: 5,
      }),
    );

    await writeMergedCourseProgress(
      {
        completedCourseNumbers: [1, 2, 4],
        currentCourseNumber: 5,
      },
      23,
      storage,
    );

    assert.deepEqual(await readCourseProgress(23, storage), {
      completedCourseNumbers: [1, 2, 3, 4],
      currentCourseNumber: 5,
    });
  });

  it('saves completed progress to the server and mirrors it locally', async () => {
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'test-device',
    });
    let requestBody = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = String(init?.body || '');
      return new Response(
        JSON.stringify({
          completed_course_numbers: [4],
          current_course_number: 5,
        }),
        { status: 200 },
      );
    };

    try {
      await saveCourseHomeCourseCompleted(
        {
          courseNumber: 4,
          lessonId: '413',
          totalCourses: 23,
        },
        apiClient,
        storage,
      );

      assert.deepEqual(JSON.parse(requestBody), {
        course_number: 4,
        lesson_id: '413',
        total_courses: 23,
        status: 'completed',
      });
      assert.deepEqual(await readCourseProgress(23, storage), {
        completedCourseNumbers: [4],
        currentCourseNumber: 5,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
