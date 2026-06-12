import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildNativeLessonControllerItems,
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
          media: { type: 'video', url: 'https://example.com/inline-challenge.mp4' },
          correctOptionId: 'A',
          options: [
            { id: 'A', label: 'A', text: '宣誓台', imageUrl: 'https://example.com/a.png' },
            { id: 'B', label: 'B', text: '餐桌' },
          ],
          autoAdvance: true,
          raw: {},
        },
        2: {
          step: 2,
          promptText: '补充完整：I am ____.',
          screenText: 'I am ___.',
          expectedPhrases: ['ready'],
          options: [],
          autoAdvance: false,
          raw: {},
        },
        3: {
          step: 3,
          promptText: '',
          screenText: '',
          options: [],
          autoAdvance: false,
          raw: {
            freeChatConfig: {
              openingQuestion: '你准备好了吗？',
            },
          },
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
      correctOptionId: 'A',
      options: [
        { id: 'A', label: 'A', text: '宣誓台', imageUrl: 'https://example.com/a.png' },
        { id: 'B', label: 'B', text: '餐桌' },
      ],
      autoAdvance: true,
      raw: {},
    },
  },
} satisfies NativeLessonDefinition;

const stageBranchLesson = {
  metadata: { id: '415', title: 'Stage Branching Test', version: 1 },
  assets: {
    backgrounds: {},
    transitionMedia: {},
    foxVideos: {},
  },
  story: { enabled: false, segments: [] },
  teaching: { enabled: false, segments: [] },
  challenges: [
    {
      key: 'challenge_stage',
      title: 'Stage Branching',
      terminalStep: 8,
      steps: {
        1: {
          step: 1,
          promptText: 'Step 1',
          screenText: 'Step 1',
          expectedPhrases: ['one'],
          options: [],
          autoAdvance: false,
          raw: { phaseTitle: 'Round 1' },
        },
        2: {
          step: 2,
          promptText: 'Step 2',
          screenText: 'Step 2',
          correctOptionId: 'A',
          options: [
            { id: 'A', label: 'A', text: 'A' },
            { id: 'B', label: 'B', text: 'B' },
          ],
          autoAdvance: false,
          raw: { phaseTitle: 'Round 1' },
        },
        3: {
          step: 3,
          promptText: 'Step 3',
          screenText: 'Step 3',
          expectedPhrases: ['three'],
          branchOnStageEnd: {
            scoreMetric: 'phase_correct_count',
            branches: [
              { condition: 'score == 3', nextStep: 6 },
              { condition: 'score >= 1', nextStep: 7 },
              { condition: 'score == 0', nextStep: 8 },
            ],
          },
          options: [],
          autoAdvance: false,
          raw: { phaseTitle: 'Round 1' },
        },
        6: {
          step: 6,
          promptText: 'All Correct Feedback',
          screenText: 'All Correct Feedback',
          options: [],
          autoAdvance: false,
          raw: { phaseTitle: 'Round 1 Feedback' },
        },
        7: {
          step: 7,
          promptText: 'Partial Feedback',
          screenText: 'Partial Feedback',
          options: [],
          autoAdvance: false,
          raw: { phaseTitle: 'Round 1 Feedback' },
        },
        8: {
          step: 8,
          promptText: 'All Wrong Feedback',
          screenText: 'All Wrong Feedback',
          options: [],
          autoAdvance: false,
          raw: { phaseTitle: 'Round 1 Feedback' },
        },
      },
    },
  ],
  freeChatBridges: {},
  flags: {},
  summary: {
    challengeCount: 1,
    stepCount: 6,
    firstStep: {
      step: 1,
      promptText: 'Step 1',
      screenText: 'Step 1',
      expectedPhrases: ['one'],
      options: [],
      autoAdvance: false,
      raw: { phaseTitle: 'Round 1' },
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
    assert.equal(challengeView.lifecycle, 'waiting_user');
    assert.equal(challengeView.media?.url, 'https://example.com/inline-challenge.mp4');

    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(getNativeLessonControllerView(lesson, state).phase, 'challenge');

    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    assert.equal(getNativeLessonControllerView(lesson, state).phase, 'free_chat');
    assert.equal(getNativeLessonControllerView(lesson, state).text, '你准备好了吗？');

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

  it('keeps the current challenge on wrong choice and advances on correct choice', () => {
    let state = createNativeLessonControllerState(lesson);
    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    state = reduceNativeLessonController(lesson, state, { type: 'next' });

    state = reduceNativeLessonController(lesson, state, {
      type: 'submit_choice',
      optionId: 'B',
    });

    let view = getNativeLessonControllerView(lesson, state);
    assert.equal(view.phase, 'challenge');
    assert.equal(view.answer?.correct, false);
    assert.equal(view.answer?.selectedOptionId, 'B');

    state = reduceNativeLessonController(lesson, state, {
      type: 'submit_choice',
      optionId: 'A',
    });

    view = getNativeLessonControllerView(lesson, state);
    assert.equal(view.phase, 'challenge');
    assert.equal(view.text, '补充完整：I am ____.');
  });

  it('keeps fill blank speech step on wrong text and advances on expected phrase', () => {
    let state = createNativeLessonControllerState(lesson);
    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    state = reduceNativeLessonController(lesson, state, { type: 'next' });
    state = reduceNativeLessonController(lesson, state, {
      type: 'submit_choice',
      optionId: 'A',
    });

    state = reduceNativeLessonController(lesson, state, {
      type: 'submit_text',
      text: 'sleepy',
    });
    assert.equal(getNativeLessonControllerView(lesson, state).answer?.correct, false);

    state = reduceNativeLessonController(lesson, state, {
      type: 'submit_text',
      text: 'I am ready',
    });
    assert.equal(getNativeLessonControllerView(lesson, state).phase, 'free_chat');
  });

  it('jumps to configured nextStep for autoAdvance challenge items', () => {
    const branchingLesson: NativeLessonDefinition = {
      ...lesson,
      story: { enabled: false, segments: [] },
      teaching: { enabled: false, segments: [] },
      challenges: [
        {
          key: 'challenge_3',
          title: '分支视频',
          terminalStep: 10,
          steps: {
            7: {
              step: 7,
              promptText: 'Step 7',
              screenText: 'Step 7',
              autoAdvance: true,
              nextStep: 10,
              options: [],
              raw: {},
            },
            8: {
              step: 8,
              promptText: 'Step 8',
              screenText: 'Step 8',
              autoAdvance: true,
              nextStep: 10,
              options: [],
              raw: {},
            },
            9: {
              step: 9,
              promptText: 'Step 9',
              screenText: 'Step 9',
              autoAdvance: true,
              nextStep: 10,
              options: [],
              raw: {},
            },
            10: {
              step: 10,
              promptText: 'Step 10',
              screenText: 'Step 10',
              autoAdvance: false,
              options: [],
              raw: {},
            },
          },
        },
      ],
      summary: {
        challengeCount: 1,
        stepCount: 4,
        firstStep: {
          step: 7,
          promptText: 'Step 7',
          screenText: 'Step 7',
          autoAdvance: true,
          nextStep: 10,
          options: [],
          raw: {},
        },
      },
    };

    let state = createNativeLessonControllerState(branchingLesson);
    let view = getNativeLessonControllerView(branchingLesson, state);
    assert.equal(view.id, 'challenge:challenge_3:7');

    state = reduceNativeLessonController(branchingLesson, state, { type: 'next' });
    view = getNativeLessonControllerView(branchingLesson, state);
    assert.equal(view.id, 'challenge:challenge_3:10');
    assert.equal(view.text, 'Step 10');
  });

  it('branches to all-correct feedback when stage score is 3', () => {
    let state = createNativeLessonControllerState(stageBranchLesson);
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'submit_text', text: 'one' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'submit_choice', optionId: 'A' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'submit_text', text: 'three' });

    const view = getNativeLessonControllerView(stageBranchLesson, state);
    assert.equal(view.text, 'All Correct Feedback');
    assert.equal(state.phaseCorrectCount, 0);
  });

  it('branches to partial feedback when stage score is between 1 and 2', () => {
    let state = createNativeLessonControllerState(stageBranchLesson);
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'submit_text', text: 'one' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'submit_choice', optionId: 'B' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'next' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'next' });

    const view = getNativeLessonControllerView(stageBranchLesson, state);
    assert.equal(view.text, 'Partial Feedback');
    assert.equal(state.phaseCorrectCount, 0);
  });

  it('branches to all-wrong feedback when stage score is 0', () => {
    let state = createNativeLessonControllerState(stageBranchLesson);
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'next' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'next' });
    state = reduceNativeLessonController(stageBranchLesson, state, { type: 'next' });

    const view = getNativeLessonControllerView(stageBranchLesson, state);
    assert.equal(view.text, 'All Wrong Feedback');
    assert.equal(state.phaseCorrectCount, 0);
  });

  it('keeps teaching and story segment voice urls on controller items', () => {
    const voiceLesson = {
      metadata: { id: '416', title: 'Voice Lesson', version: 1 },
      assets: { backgrounds: {}, transitionMedia: {}, foxVideos: {} },
      story: {
        enabled: true,
        segments: [
          {
            spokenText: 'Story intro',
            voiceUrl: 'https://example.com/story.mp3',
          },
        ],
      },
      teaching: {
        enabled: true,
        segments: [
          {
            kind: 'narration',
            spokenText: 'Teaching intro',
            voiceUrl: 'https://example.com/teaching.mp3',
            mediaDescriptionVoiceUrl: 'https://example.com/teaching-desc.mp3',
          },
        ],
      },
      challenges: [],
      freeChatBridges: {},
      flags: {},
      summary: { challengeCount: 0, stepCount: 0, firstStep: null },
    } satisfies NativeLessonDefinition;

    const items = buildNativeLessonControllerItems(voiceLesson);
    const storyItem = items.find((item) => item.phase === 'story');
    const teachingItem = items.find((item) => item.phase === 'teaching');

    assert.equal(storyItem?.voiceUrl, 'https://example.com/story.mp3');
    assert.equal(teachingItem?.voiceUrl, 'https://example.com/teaching.mp3');
    assert.equal(teachingItem?.mediaDescriptionVoiceUrl, 'https://example.com/teaching-desc.mp3');
  });
});
