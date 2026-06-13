import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getStructuredSpeechRecordingCloseReason,
  getStructuredSpeechAutoTurnKey,
  shouldAutoStartStructuredSpeechRecording,
  shouldAutoSubmitStructuredSpeechRecording,
} from './structuredSpeechAutoRecording.ts';
import type { NativeLessonControllerView } from './nativeLessonController.ts';

const SPEECH_VIEW: NativeLessonControllerView = {
  id: 'teaching-step',
  title: 'teaching',
  phase: 'teaching',
  lifecycle: 'waiting_user',
  text: '跟我读一遍',
  screenText: 'He is sick.',
  backgroundImageUrl: '',
  media: null,
  step: {
    step: 8,
    promptText: '跟我读一遍',
    screenText: 'He is sick.',
    responseMode: 'speech',
    expectedPhrases: ['He is sick.'],
    options: [],
    autoAdvance: false,
    raw: {},
  },
  isPaused: false,
  index: 7,
  total: 20,
  canGoNext: true,
};

const FREE_CHAT_VIEW: NativeLessonControllerView = {
  ...SPEECH_VIEW,
  id: 'free-chat-step',
  phase: 'free_chat',
  text: '和欧波聊聊',
  screenText: '和欧波聊聊',
  step: {
    ...SPEECH_VIEW.step!,
    step: 12,
    promptText: '和欧波聊聊',
    screenText: '和欧波聊聊',
    responseMode: undefined,
    expectedPhrases: [],
  },
};

describe('structuredSpeechAutoRecording', () => {
  it('derives a stable auto-start turn key for follow-read turns', () => {
    assert.equal(
      getStructuredSpeechAutoTurnKey(SPEECH_VIEW),
      'teaching:waiting_user:8:He is sick.',
    );
  });

  it('keeps free-chat auto recording behavior intact', () => {
    assert.equal(
      getStructuredSpeechAutoTurnKey(FREE_CHAT_VIEW),
      'free_chat:waiting_user:12:和欧波聊聊',
    );
  });

  it('auto starts when a speech turn is ready for follow-read input', () => {
    assert.equal(
      shouldAutoStartStructuredSpeechRecording({
        controllerView: SPEECH_VIEW,
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: false,
        recordingStatus: 'idle',
        lastStartedTurnKey: null,
      }),
      true,
    );
  });

  it('waits until assistant playback has finished before auto starting', () => {
    assert.equal(
      shouldAutoStartStructuredSpeechRecording({
        controllerView: SPEECH_VIEW,
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: true,
        recordingStatus: 'idle',
        lastStartedTurnKey: null,
      }),
      false,
    );
  });

  it('auto submits recorded structured speech once per recording uri', () => {
    assert.equal(
      shouldAutoSubmitStructuredSpeechRecording({
        controllerView: SPEECH_VIEW,
        recordingStatus: 'recorded',
        recordingUri: 'file:///tmp/follow-read.m4a',
        hasSpeech: true,
        lastSubmittedRecordingUri: null,
      }),
      true,
    );

    assert.equal(
      shouldAutoSubmitStructuredSpeechRecording({
        controllerView: SPEECH_VIEW,
        recordingStatus: 'recorded',
        recordingUri: 'file:///tmp/follow-read.m4a',
        hasSpeech: true,
        lastSubmittedRecordingUri: 'file:///tmp/follow-read.m4a',
      }),
      false,
    );
  });

  it('does not auto submit silent recorded speech turns', () => {
    assert.equal(
      shouldAutoSubmitStructuredSpeechRecording({
        controllerView: SPEECH_VIEW,
        recordingStatus: 'recorded',
        recordingUri: 'file:///tmp/follow-read.m4a',
        hasSpeech: false,
        lastSubmittedRecordingUri: null,
      }),
      false,
    );
  });

  it('forces the microphone closed once the lesson leaves the user speech turn', () => {
    assert.equal(
      getStructuredSpeechRecordingCloseReason({
        controllerView: {
          ...SPEECH_VIEW,
          lifecycle: 'assistant_turn',
        },
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: false,
        recordingStatus: 'recording',
      }),
      'lifecycle_assistant_turn',
    );
  });

  it('forces the microphone closed while assistant audio is active', () => {
    assert.equal(
      getStructuredSpeechRecordingCloseReason({
        controllerView: SPEECH_VIEW,
        realtimeConnected: true,
        audioStatus: 'playing',
        assistantPlaybackPending: false,
        recordingStatus: 'recording',
      }),
      'audio_playing',
    );
  });

  it('keeps the microphone open only during an active waiting_user speech turn', () => {
    assert.equal(
      getStructuredSpeechRecordingCloseReason({
        controllerView: SPEECH_VIEW,
        realtimeConnected: true,
        audioStatus: 'idle',
        assistantPlaybackPending: false,
        recordingStatus: 'recording',
      }),
      null,
    );
  });
});
