import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createNativeLessonControllerState,
  getNativeLessonControllerView,
  reduceNativeLessonController,
} from './nativeLessonController.ts';
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
        spokenText: '看见这信没——封蜡是地球加握手！',
      },
    ],
  },
  teaching: {
    enabled: true,
    segments: [
      {
        text: '新学员要完成入队宣誓。',
        backgroundImageUrl: 'https://example.com/teaching.jpg',
      },
    ],
  },
  challenges: [
    {
      key: 'club',
      title: '入队宣誓',
      terminalStep: 1,
      steps: {
        1: {
          step: 1,
          promptText: '到了！看那台子——就是入队宣誓台！',
          screenText: '找到宣誓台',
          mediaCueId: 'challenge_video',
          options: [],
          autoAdvance: true,
          raw: {},
        },
      },
    },
  ],
  freeChatBridges: { preDuolingo: { openingQuestion: '你准备好了吗？' } },
  flags: {},
  summary: {
    challengeCount: 1,
    stepCount: 1,
    firstStep: {
      step: 1,
      promptText: '到了！看那台子——就是入队宣誓台！',
      screenText: '找到宣誓台',
      mediaCueId: 'challenge_video',
      options: [],
      autoAdvance: true,
      raw: {},
    },
  },
} satisfies NativeLessonDefinition;

describe('nativeLessonController', () => {
  it('starts from story instead of the first challenge step', () => {
    const state = createNativeLessonControllerState(lesson);
    const view = getNativeLessonControllerView(lesson, state);

    assert.equal(view.phase, 'story');
    assert.equal(view.lifecycle, 'waiting_media');
    assert.equal(view.text, '看见这信没——封蜡是地球加握手！');
    assert.equal(view.media?.url, 'https://example.com/letter.mp4');
  });

  it('advances through teaching, challenge, free chat, and end', () => {
    let state = createNativeLessonControllerState(lesson);
    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(getNativeLessonControllerView(lesson, state).phase, 'teaching');

    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    const challengeView = getNativeLessonControllerView(lesson, state);
    assert.equal(challengeView.phase, 'challenge');
    assert.equal(challengeView.text, '到了！看那台子——就是入队宣誓台！');

    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(getNativeLessonControllerView(lesson, state).phase, 'free_chat');

    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(getNativeLessonControllerView(lesson, state).phase, 'end');
    assert.equal(state.snapshot.lifecycle, 'completed');
  });

  it('pause and resume do not change the current step', () => {
    let state = createNativeLessonControllerState(lesson);
    state = reduceNativeLessonController(lesson, state, { type: 'pause' });

    assert.equal(state.isPaused, true);
    assert.equal(state.snapshot.currentIndex, 0);

    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(state.snapshot.currentIndex, 0);

    state = reduceNativeLessonController(lesson, state, { type: 'resume' });
    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(state.snapshot.currentIndex, 1);
  });
});
