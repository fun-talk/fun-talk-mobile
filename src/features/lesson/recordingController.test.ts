import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createRecordingControllerState,
  reduceRecordingController,
} from './recordingController.ts';

describe('recordingController', () => {
  it('moves through permission, recording, and submitted states', () => {
    let state = createRecordingControllerState({ silenceTimeoutMs: 2000 });

    state = reduceRecordingController(state, { type: 'permission_granted' });
    state = reduceRecordingController(state, { type: 'start' });
    state = reduceRecordingController(state, { type: 'metering', metering: -28, elapsedMs: 300 });
    state = reduceRecordingController(state, { type: 'metering', metering: -27, elapsedMs: 500 });
    state = reduceRecordingController(state, {
      type: 'stop',
      uri: 'file:///tmp/answer.m4a',
      durationMs: 1200,
    });
    state = reduceRecordingController(state, { type: 'submit' });

    assert.equal(state.status, 'submitted');
    assert.equal(state.recordingUri, 'file:///tmp/answer.m4a');
    assert.equal(state.hasSpeech, true);
    assert.equal(state.vadConfig.silenceTimeoutMs, 2000);
  });

  it('keeps permission denial visible', () => {
    const state = reduceRecordingController(createRecordingControllerState(), {
      type: 'permission_denied',
    });

    assert.equal(state.status, 'permission_denied');
    assert.equal(state.errorText, '需要麦克风权限才能录音。');
  });

  it('auto stops when VAD reaches a timeout', () => {
    let state = createRecordingControllerState();

    state = reduceRecordingController(state, { type: 'permission_granted' });
    state = reduceRecordingController(state, { type: 'start' });
    state = reduceRecordingController(state, { type: 'metering', metering: -60, elapsedMs: 19000 });

    assert.equal(state.status, 'auto_stopping');
    assert.equal(state.shouldStopRecording, true);
  });

  it('does not start speech from a single noisy metering spike', () => {
    let state = createRecordingControllerState();

    state = reduceRecordingController(state, { type: 'permission_granted' });
    state = reduceRecordingController(state, { type: 'start' });
    state = reduceRecordingController(state, { type: 'metering', metering: -25, elapsedMs: 200 });
    state = reduceRecordingController(state, { type: 'metering', metering: -60, elapsedMs: 400 });

    assert.equal(state.hasSpeech, false);
    assert.equal(state.status, 'recording');
  });

  it('preserves custom VAD config across cancel and restart', () => {
    let state = createRecordingControllerState({ silenceTimeoutMs: 2000 });

    state = reduceRecordingController(state, { type: 'permission_granted' });
    state = reduceRecordingController(state, { type: 'start' });
    state = reduceRecordingController(state, { type: 'cancel' });
    state = reduceRecordingController(state, { type: 'start' });

    assert.equal(state.vad.silenceTimeoutMs, 2000);
    assert.equal(state.status, 'recording');
  });
});
