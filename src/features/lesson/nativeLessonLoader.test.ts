import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApiClient } from '@/lib/api/client';

import {
  buildNativeRealtimeLessonPath,
  fetchNativeLessonDefinition,
  getNativeLessonRequestFromParams,
  normalizeNativeLessonDefinition,
} from './nativeLessonLoader.ts';

function createApiClient(handler: (path: string) => Promise<Response>): ApiClient {
  return {
    baseUrl: 'http://localhost:9000',
    request: (path) => handler(path),
    get: (path) => handler(path),
    post: (path) => handler(path),
  };
}

const rawLesson = {
  metadata: {
    id: '413',
    title: '动物色彩博物馆',
    version: 1,
    botName: '欧波',
    defaultSpeaker: 'zh_male_taocheng_uranus_bigtts',
  },
  assets: {
    transitionMedia: {
      duck: { type: 'image', url: 'https://example.com/duck.png' },
    },
  },
  story: { enabled: true },
  teaching: { enabled: true },
  challenges: [
    {
      key: 'template_2',
      title: '白色通道',
      steps: {
        '1': {
          step: 1,
          promptText: 'Look at the duck.',
          screenText: 'A white duck',
          mediaCueId: 'duck',
          autoAdvance: true,
        },
        '2': {
          step: 2,
          promptText: 'Choose white.',
          responseMode: 'choice',
          correctOptionId: 'A',
          options: [
            { id: 'A', label: 'A', text: 'white' },
            { id: 'B', label: 'B', text: 'black' },
          ],
        },
      },
    },
  ],
  freeChatBridges: {},
  flags: { storyIntroEnabled: true, teachingIntroEnabled: true },
};

describe('nativeLessonLoader', () => {
  it('uses section_id before lesson_id when building the request', () => {
    assert.deepEqual(
      getNativeLessonRequestFromParams({
        lesson_id: '413',
        section_id: 'section-1',
      }),
      { sectionId: 'section-1' },
    );
    assert.equal(
      buildNativeRealtimeLessonPath({ sectionId: 'section-1' }),
      '/api/v1/realtime_lesson?section_id=section-1',
    );
  });

  it('normalizes native lesson metadata and challenge summary', () => {
    const lesson = normalizeNativeLessonDefinition(rawLesson);
    assert.equal(lesson.metadata.id, '413');
    assert.equal(lesson.metadata.title, '动物色彩博物馆');
    assert.equal(lesson.metadata.botName, '欧波');
    assert.equal(lesson.summary.challengeCount, 1);
    assert.equal(lesson.summary.stepCount, 2);
    assert.equal(lesson.summary.firstStep?.promptText, 'Look at the duck.');
    assert.equal(lesson.challenges[0]?.steps[2]?.correctOptionId, 'A');
  });

  it('fetches and normalizes realtime lesson responses through the api client', async () => {
    const seenPaths: string[] = [];
    const apiClient = createApiClient(async (path) => {
      seenPaths.push(path);
      return Response.json({ lesson: rawLesson });
    });

    const lesson = await fetchNativeLessonDefinition(apiClient, { lessonId: '413' });

    assert.deepEqual(seenPaths, ['/api/v1/realtime_lesson?lesson_id=413']);
    assert.equal(lesson.metadata.title, '动物色彩博物馆');
  });

  it('raises a useful error when realtime lesson loading fails', async () => {
    const apiClient = createApiClient(async () => new Response('missing', { status: 404 }));

    await assert.rejects(
      () => fetchNativeLessonDefinition(apiClient, { lessonId: '999' }),
      /加载实时教学配置失败：404 missing/,
    );
  });
});
