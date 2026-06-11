import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getFreeChatAutoTurnKey,
  shouldAutoStartFreeChatRecording,
  shouldAutoSubmitFreeChatRecording,
} from './freeChatAutoRecording.ts';
import type { NativeLessonControllerView } from './nativeLessonController.ts';

const FREE_CHAT_VIEW: NativeLessonControllerView = {
  id: 'free-chat-step',
  title: 'free chat',
  phase: 'free_chat',
  lifecycle: 'waiting_user',
  text: '和欧波聊聊',
  screenText: '和欧波聊聊',
  progressLabel: '4 / 4',
  backgroundImageUrl: undefined,
  media: null,
  step: {
    step: 12,
    promptText: '和欧波聊聊',
    screenText: '和欧波聊聊',
    options: [],
    autoAdvance: false,
    raw: {},
  },
};

describe('freeChatAutoRecording', () => {
  it('derives a stable auto-start turn key for free-chat waiting_user turns', () => {
    assert.equal(
      getFreeChatAutoTurnKey(FREE_CHAT_VIEW),
      'free_chat:waiting_user:12:和欧波聊聊',
    );
  });

  it('auto starts when realtime is connected and free chat is awaiting the user', () => {
    assert.equal(
      shouldAutoStartFreeChatRecording({
        controllerView: FREE_CHAT_VIEW,
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: false,
        recordingStatus: 'idle',
        lastStartedTurnKey: null,
      }),
      true,
    );
  });

  it('waits until the assistant playback has fully finished before auto starting', () => {
    assert.equal(
      shouldAutoStartFreeChatRecording({
        controllerView: FREE_CHAT_VIEW,
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: true,
        recordingStatus: 'idle',
        lastStartedTurnKey: null,
      }),
      false,
    );
  });

  it('does not auto start twice for the same free-chat turn', () => {
    assert.equal(
      shouldAutoStartFreeChatRecording({
        controllerView: FREE_CHAT_VIEW,
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: false,
        recordingStatus: 'submitted',
        lastStartedTurnKey: 'free_chat:waiting_user:12:和欧波聊聊',
      }),
      false,
    );
  });

  it('auto submits recorded free-chat audio once per recording uri', () => {
    assert.equal(
      shouldAutoSubmitFreeChatRecording({
        controllerView: FREE_CHAT_VIEW,
        recordingStatus: 'recorded',
        recordingUri: 'file:///tmp/free-chat.m4a',
        lastSubmittedRecordingUri: null,
      }),
      true,
    );

    assert.equal(
      shouldAutoSubmitFreeChatRecording({
        controllerView: FREE_CHAT_VIEW,
        recordingStatus: 'recorded',
        recordingUri: 'file:///tmp/free-chat.m4a',
        lastSubmittedRecordingUri: 'file:///tmp/free-chat.m4a',
      }),
      false,
    );
  });
});
