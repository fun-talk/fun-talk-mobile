import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApiClient } from '@/lib/api/client';

import {
  buildOpeningSceneEntryPath,
  resolveCourseLessonEntryPath,
  resolveOpeningSceneExitPath,
  sanitizeInternalReturnPath,
} from './courseOpeningSceneEntry';

describe('courseOpeningSceneEntry', () => {
  it('sanitizes internal return paths', () => {
    assert.equal(
      sanitizeInternalReturnPath('/app/lesson?lesson_id=3&autostart=1'),
      '/app/lesson?lesson_id=3&autostart=1',
    );
    assert.equal(sanitizeInternalReturnPath('https://evil.test/app/courses'), null);
    assert.equal(sanitizeInternalReturnPath('//evil.test/app/courses'), null);
  });

  it('builds opening scene entry with return target', () => {
    assert.equal(
      buildOpeningSceneEntryPath('12', '/app/lesson?lesson_id=12'),
      '/demos/openingScene?lesson_id=12&return_to=%2Fapp%2Flesson%3Flesson_id%3D12',
    );
  });

  it('prefers return_to when resolving opening scene exit', () => {
    assert.equal(
      resolveOpeningSceneExitPath('12', '/app/lesson?lesson_id=12'),
      '/app/lesson?lesson_id=12',
    );
    assert.equal(
      resolveOpeningSceneExitPath('12', null),
      '/demos/realtimeConversationV2?lesson_id=12',
    );
  });

  it('skips opening scene lookup when requested', async () => {
    const apiClient = createApiClient({
      baseUrl: 'http://localhost:9000',
      getDeviceId: async () => 'test-device',
    });

    const path = await resolveCourseLessonEntryPath(
      new URLSearchParams('lesson_id=9&autostart=1'),
      true,
      apiClient,
    );
    assert.equal(path, '/app/lesson?lesson_id=9&autostart=1');
  });

  it('falls back to lesson path when opening scene lookup hangs', async () => {
    const apiClient = {
      baseUrl: 'http://localhost:9000',
      request: async () => new Promise<Response>(() => {}),
      get: async () => new Promise<Response>(() => {}),
      post: async () => new Promise<Response>(() => {}),
    };

    const path = await resolveCourseLessonEntryPath(
      new URLSearchParams('lesson_id=9&autostart=1'),
      false,
      apiClient,
      10,
    );
    assert.equal(path, '/app/lesson?lesson_id=9&autostart=1');
  });

  it('falls back to lesson path when opening scene lookup rejects', async () => {
    const apiClient = {
      baseUrl: 'http://localhost:9000',
      request: async () => {
        throw new Error('network failed');
      },
      get: async () => {
        throw new Error('network failed');
      },
      post: async () => {
        throw new Error('network failed');
      },
    };

    const path = await resolveCourseLessonEntryPath(
      new URLSearchParams('lesson_id=9&autostart=1'),
      false,
      apiClient,
    );
    assert.equal(path, '/app/lesson?lesson_id=9&autostart=1');
  });
});
