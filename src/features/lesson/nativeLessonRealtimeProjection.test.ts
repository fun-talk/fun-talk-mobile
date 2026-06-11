import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyRealtimeLessonEvent,
  getRealtimeControllerView,
} from './nativeLessonRealtimeProjection.ts';
import type { RealtimeLessonProjectionState } from './nativeLessonRealtimeProjection.ts';

const initialState: RealtimeLessonProjectionState = {
  connected: false,
  sessionId: null,
  lastEvent: null,
  currentStep: null,
  currentLifecycle: null,
  snapshot: null,
  answer: undefined,
  completed: false,
  errorText: '',
};

describe('nativeLessonRealtimeProjection', () => {
  it('restores UI state from lesson snapshot instead of replaying behavior', () => {
    const state = applyRealtimeLessonEvent(initialState, {
      event: 'lesson_state_snapshot',
      phase: 'challenge',
      currentStepId: 3,
      lifecycle: 'waiting_user',
      inputMode: 'choice',
      screenText: '找出宣誓台',
      currentMedia: { cueId: 'stage', kind: 'image', url: 'https://example.com/stage.png' },
      choiceOptions: [{ optionId: 'A', label: 'A', text: '宣誓台' }],
      completedStepIds: [1, 2],
      totalSteps: 8,
      userTurnOpen: true,
    });
    const view = getRealtimeControllerView(state, {
      title: '入队宣誓',
      backgroundImageUrl: 'https://example.com/bg.jpg',
    });

    assert.equal(view?.phase, 'challenge');
    assert.equal(view?.lifecycle, 'waiting_user');
    assert.equal(view?.screenText, '找出宣誓台');
    assert.equal(view?.media?.url, 'https://example.com/stage.png');
    assert.equal(view?.step?.options[0]?.id, 'A');
    assert.equal(view?.index, 2);
    assert.equal(view?.total, 8);
  });

  it('updates assistant text and answer feedback from server events', () => {
    let state = applyRealtimeLessonEvent(initialState, {
      event: 'step_started',
      lifecycle: 'waiting_user',
      step: {
        stepId: 5,
        phase: 'challenge',
        assistantPrompt: 'Say ready.',
        inputMode: 'speech',
        advancePolicy: 'wait_user',
        screenText: 'I am ___.',
        expectedPhrases: ['ready'],
        choiceOptions: [],
      },
    });
    state = applyRealtimeLessonEvent(state, {
      event: 'answer_evaluated',
      stepId: 5,
      correct: false,
      feedbackText: '再试一次。',
    });

    const view = getRealtimeControllerView(state, { title: 'Lesson' });
    assert.equal(view?.text, 'Say ready.');
    assert.equal(view?.step?.responseMode, 'speech');
    assert.equal(view?.answer?.correct, false);
    assert.equal(view?.answer?.feedbackText, '再试一次。');
  });

  it('uses step_started lifecycle before a snapshot arrives', () => {
    const state = applyRealtimeLessonEvent(initialState, {
      event: 'step_started',
      lifecycle: 'waiting_media',
      step: {
        stepId: 2,
        phase: 'story',
        assistantPrompt: '看这段视频。',
        inputMode: 'none',
        advancePolicy: 'auto',
        expectedPhrases: [],
        choiceOptions: [],
        mediaCue: {
          cueId: 'intro-video',
          kind: 'video',
          url: 'https://example.com/intro.mp4',
        },
        screenText: '看这段视频。',
        screenTextFallback: '',
        successReply: '',
        retryText: '',
      },
    });

    const view = getRealtimeControllerView(state, { title: 'Lesson' });
    assert.equal(view?.lifecycle, 'waiting_media');
    assert.equal(view?.media?.url, 'https://example.com/intro.mp4');
  });

  it('opens the user turn when the server emits user_turn_opened', () => {
    const state = applyRealtimeLessonEvent(
      {
        ...initialState,
        currentLifecycle: 'assistant_turn',
        currentStep: {
          stepId: 12,
          phase: 'free_chat',
          assistantPrompt: '和欧波聊聊',
          inputMode: 'speech',
          advancePolicy: 'wait_user',
          expectedPhrases: [],
          choiceOptions: [],
          screenText: '和欧波聊聊',
          screenTextFallback: '和欧波聊聊',
          successReply: '',
          retryText: '',
        },
      },
      {
        event: 'user_turn_opened',
        stepId: 12,
        inputMode: 'speech',
      },
    );
    const view = getRealtimeControllerView(state, { title: 'Lesson' });

    assert.equal(state.currentLifecycle, 'waiting_user');
    assert.equal(view?.lifecycle, 'waiting_user');
    assert.equal(view?.phase, 'free_chat');
  });

  it('marks session ready, completed, and errors', () => {
    let state = applyRealtimeLessonEvent(initialState, {
      event: 'session_ready',
      sessionId: 'session-1',
      useLessonRuntime: true,
    });
    state = applyRealtimeLessonEvent(state, {
      event: 'lesson_completed',
      reason: 'finished',
    });
    state = applyRealtimeLessonEvent(state, {
      event: 'error',
      message: 'boom',
    });

    assert.equal(state.connected, true);
    assert.equal(state.sessionId, 'session-1');
    assert.equal(state.completed, true);
    assert.equal(state.errorText, 'boom');
  });
});
