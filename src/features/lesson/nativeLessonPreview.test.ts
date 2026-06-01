import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveNativeLessonOpeningPreview } from './nativeLessonPreview.ts';
import type { NativeLessonDefinition } from './nativeLessonTypes.ts';

const lesson = {
  metadata: { id: '414', title: '全球儿童俱乐部今日紧急任务——招募7位新学员', version: 1 },
  assets: {
    backgrounds: { story: 'https://example.com/story-bg.jpg' },
    transitionMedia: {
      challenge_video: { type: 'video', url: 'https://example.com/challenge.mp4' },
    },
    foxVideos: {},
  },
  story: {
    enabled: true,
    backgroundImageUrl: 'https://example.com/kids-club.jpg',
    segments: [
      {
        mediaType: 'video',
        mediaUrl: 'https://example.com/letter.mp4',
        spokenText: "看见这信没——封蜡是地球加握手！只有'全球儿童俱乐部'——才会用这种封蜡！",
      },
    ],
  },
  teaching: {},
  challenges: [
    {
      key: 'club',
      title: '入队宣誓',
      terminalStep: 1,
      steps: {
        1: {
          step: 1,
          promptText: '到了！看那台子——就是入队宣誓台！',
          screenText: '',
          mediaCueId: 'challenge_video',
          options: [],
          autoAdvance: true,
          raw: {},
        },
      },
    },
  ],
  freeChatBridges: {},
  flags: {},
  summary: {
    challengeCount: 1,
    stepCount: 1,
    firstStep: {
      step: 1,
      promptText: '到了！看那台子——就是入队宣誓台！',
      screenText: '',
      mediaCueId: 'challenge_video',
      options: [],
      autoAdvance: true,
      raw: {},
    },
  },
} satisfies NativeLessonDefinition;

describe('nativeLessonPreview', () => {
  it('prefers story opening content before challenge summary content', () => {
    const preview = resolveNativeLessonOpeningPreview(lesson);

    assert.equal(preview.backgroundImageUrl, 'https://example.com/kids-club.jpg');
    assert.equal(preview.media?.url, 'https://example.com/letter.mp4');
    assert.match(preview.speechText, /看见这信没/);
  });
});
