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
});
