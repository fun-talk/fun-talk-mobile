import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFreeChatPanelViewState } from './freeChatPanelState.ts';
import type { RecordingControllerState } from './recordingController.ts';

function createTestRecordingState(
  overrides: Partial<RecordingControllerState> = {},
): RecordingControllerState {
  return {
    status: 'idle',
    hasPermission: false,
    recordingUri: null,
    durationMs: 0,
    metering: null,
    hasSpeech: false,
    shouldStopRecording: false,
    errorText: null,
    vadConfig: {},
    vad: {
      silenceTimeoutMs: 2000,
      speechThreshold: -45,
      hasSpeech: false,
      startedAtMs: null,
      lastSpeechAtMs: null,
      shouldAutoSubmit: false,
    },
    ...overrides,
  };
}

describe('freeChatPanelState', () => {
  it('shows a waiting state while assistant playback is still pending', () => {
    const viewState = getFreeChatPanelViewState({
      assistantPlaybackPending: true,
      state: createTestRecordingState(),
    });

    assert.equal(viewState.statusText, '欧波正在说话');
    assert.equal(viewState.helperText.includes('自动开始收音'), true);
    assert.equal(viewState.showPulse, false);
  });

  it('shows a recording state once the mic is actively listening', () => {
    const state = createTestRecordingState({
      hasPermission: true,
      status: 'recording',
    });
    const viewState = getFreeChatPanelViewState({
      assistantPlaybackPending: false,
      state,
    });

    assert.equal(viewState.statusText, '正在收音，请说话...');
    assert.equal(viewState.showPulse, true);
  });

  it('keeps the assistant response state visible after submit', () => {
    const state = createTestRecordingState({
      hasPermission: true,
      status: 'submitted',
    });
    const viewState = getFreeChatPanelViewState({
      assistantPlaybackPending: false,
      state,
    });

    assert.equal(viewState.statusText, '欧波正在回复你');
    assert.equal(viewState.dotColor, '#0BCD3F');
  });
});
